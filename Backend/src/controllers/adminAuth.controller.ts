import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { Admin } from "../models/Admin";
import { OtpSession } from "../models/OtpSession";
import { AppError } from "../utils/AppError";
import { generateOtp, hashOtp, verifyOtp as verifyOtpHash } from "../services/otp";
import { signAccessToken, createRefreshToken, validateRefreshToken, revokeRefreshToken } from "../services/token";
import { sendOtpEmail } from "../services/email";
import type {
  LoginBody,
  VerifyOtpBody,
  ForgotPasswordSendBody,
  ForgotPasswordResetBody,
  ResetPasswordConfirmBody,
} from "../schemas/auth";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_TTL_SECONDS = 300;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const MAX_OTP_ATTEMPTS = 5;

export async function login(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const { loginEmail, password } = req.body as LoginBody;
  const admin = await Admin.findOne({ loginEmail });
  if (!admin) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");

  if (admin.lockUntil && admin.lockUntil > new Date()) {
    throw new AppError(403, "ACCOUNT_LOCKED", "Account is temporarily locked");
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    admin.failedLoginAttempts += 1;
    if (admin.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      admin.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await admin.save();
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");
  }

  admin.failedLoginAttempts = 0;
  admin.lockUntil = undefined;
  admin.lastLoginAt = new Date();
  await admin.save();

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const session = await OtpSession.create({
    purpose: "admin_login",
    identifier: loginEmail,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attemptCount: 0,
  });

  try {
    await sendOtpEmail(admin.otpDeliveryEmail, otp);
  } catch {
    // Email delivery failure does not block the login flow
  }

  res.json({ otpSessionId: session._id.toString(), expiresInSeconds: OTP_TTL_SECONDS });
}

export async function verifyOtp(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const { otpSessionId, otp } = req.body as VerifyOtpBody;
  const session = await OtpSession.findById(otpSessionId);
  if (!session) throw new AppError(401, "INVALID_OTP", "OTP session not found");

  if (session.expiresAt < new Date()) {
    throw new AppError(401, "OTP_EXPIRED", "OTP has expired");
  }

  if (session.attemptCount >= MAX_OTP_ATTEMPTS) {
    throw new AppError(429, "OTP_MAX_ATTEMPTS", "Too many OTP attempts");
  }

  const valid = await verifyOtpHash(otp, session.otpHash);
  if (!valid) {
    session.attemptCount += 1;
    await session.save();
    throw new AppError(401, "INVALID_OTP", "Invalid OTP");
  }

  const admin = await Admin.findOne({ loginEmail: session.identifier });
  if (!admin) throw new AppError(401, "INVALID_OTP", "Admin not found");

  await OtpSession.deleteOne({ _id: session._id });

  const rawRefresh = await createRefreshToken(admin._id as Types.ObjectId);
  const accessToken = signAccessToken({ adminId: admin._id.toString(), role: "admin" });

  res.cookie("refreshToken", rawRefresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken });
}

export async function refresh(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const raw = req.cookies?.refreshToken as string | undefined;
  if (!raw) throw new AppError(401, "INVALID_REFRESH_TOKEN", "No refresh token");

  let adminId: string;
  try {
    const result = await validateRefreshToken(raw);
    adminId = result.adminId.toString();
  } catch {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
  }

  const accessToken = signAccessToken({ adminId, role: "admin" });
  res.json({ accessToken });
}

export async function logout(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const raw = req.cookies?.refreshToken as string | undefined;
  if (raw) {
    try {
      const { tokenHash } = await validateRefreshToken(raw);
      await revokeRefreshToken(tokenHash);
    } catch {
      // Token not found — proceed with logout anyway
    }
  }
  res.clearCookie("refreshToken");
  res.json({ success: true });
}

export async function me(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const admin = await Admin.findById(req.admin?.adminId).select("-passwordHash");
  if (!admin) throw new AppError(404, "NOT_FOUND", "Admin not found");
  res.json(admin);
}

export async function forgotPasswordSendOtp(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const { loginEmail } = req.body as ForgotPasswordSendBody;
  const admin = await Admin.findOne({ loginEmail });
  if (!admin) {
    res.json({ success: true });
    return;
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  await OtpSession.create({
    purpose: "admin_forgot",
    identifier: loginEmail,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attemptCount: 0,
  });

  try {
    await sendOtpEmail(admin.otpDeliveryEmail, otp);
  } catch {
    // Silent failure
  }

  res.json({ success: true });
}

export async function forgotPasswordReset(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const { otpSessionId, otp, newPassword } = req.body as ForgotPasswordResetBody;
  const session = await OtpSession.findById(otpSessionId);
  if (!session || session.purpose !== "admin_forgot") {
    throw new AppError(401, "INVALID_OTP", "Invalid OTP session");
  }

  if (session.expiresAt < new Date()) throw new AppError(401, "OTP_EXPIRED", "OTP has expired");
  if (session.attemptCount >= MAX_OTP_ATTEMPTS) throw new AppError(429, "OTP_MAX_ATTEMPTS", "Too many attempts");

  const valid = await verifyOtpHash(otp, session.otpHash);
  if (!valid) {
    session.attemptCount += 1;
    await session.save();
    throw new AppError(401, "INVALID_OTP", "Invalid OTP");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await Admin.findOneAndUpdate({ loginEmail: session.identifier }, { passwordHash, passwordChangedAt: new Date() });
  await OtpSession.deleteOne({ _id: session._id });

  res.json({ success: true });
}

export async function resetPasswordSendOtp(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const admin = await Admin.findById(req.admin?.adminId);
  if (!admin) throw new AppError(404, "NOT_FOUND", "Admin not found");

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  await OtpSession.create({
    purpose: "admin_reset",
    identifier: admin.loginEmail,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attemptCount: 0,
  });

  try {
    await sendOtpEmail(admin.otpDeliveryEmail, otp);
  } catch {
    // Silent failure
  }

  res.json({ success: true });
}

export async function resetPasswordConfirm(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const { otpSessionId, otp, newPassword } = req.body as ResetPasswordConfirmBody;
  const session = await OtpSession.findById(otpSessionId);
  if (!session || session.purpose !== "admin_reset") {
    throw new AppError(401, "INVALID_OTP", "Invalid OTP session");
  }

  if (session.expiresAt < new Date()) throw new AppError(401, "OTP_EXPIRED", "OTP has expired");
  if (session.attemptCount >= MAX_OTP_ATTEMPTS) throw new AppError(429, "OTP_MAX_ATTEMPTS", "Too many attempts");

  const valid = await verifyOtpHash(otp, session.otpHash);
  if (!valid) {
    session.attemptCount += 1;
    await session.save();
    throw new AppError(401, "INVALID_OTP", "Invalid OTP");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await Admin.findByIdAndUpdate(req.admin?.adminId, { passwordHash, passwordChangedAt: new Date() });
  await OtpSession.deleteOne({ _id: session._id });

  res.json({ success: true });
}
