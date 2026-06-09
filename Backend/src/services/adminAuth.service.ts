import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { Admin } from "../models/Admin";
import { OtpSession } from "../models/OtpSession";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { generateOtp, hashOtp, verifyOtp as verifyOtpHash } from "./otp";
import { signAccessToken, createRefreshToken, validateRefreshToken, revokeRefreshToken } from "./token";
import { sendOtpEmail } from "./email";
import {
  OTP_TTL_MS,
  OTP_TTL_SECONDS,
  LOCK_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  MAX_OTP_ATTEMPTS,
  BCRYPT_ROUNDS_PASSWORD,
} from "../config/constants";

export async function login(
  loginEmail: string,
  password: string
): Promise<{ otpSessionId: string; expiresInSeconds: number }> {
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
  } catch (err) {
    logger.warn({ err, adminId: admin._id }, "OTP email delivery failed — login flow continues");
  }

  return { otpSessionId: session._id.toString(), expiresInSeconds: OTP_TTL_SECONDS };
}

export async function verifyOtpAndIssueTokens(
  otpSessionId: string,
  otp: string
): Promise<{ accessToken: string; rawRefresh: string }> {
  const session = await OtpSession.findById(otpSessionId);
  if (!session) throw new AppError(401, "INVALID_OTP", "OTP session not found");

  if (session.expiresAt < new Date()) throw new AppError(401, "OTP_EXPIRED", "OTP has expired");
  if (session.attemptCount >= MAX_OTP_ATTEMPTS) throw new AppError(429, "OTP_MAX_ATTEMPTS", "Too many OTP attempts");

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

  return { accessToken, rawRefresh };
}

export async function refreshAccessToken(raw: string): Promise<{ accessToken: string }> {
  let adminId: string;
  try {
    const result = await validateRefreshToken(raw);
    adminId = result.adminId.toString();
  } catch {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
  }
  const accessToken = signAccessToken({ adminId, role: "admin" });
  return { accessToken };
}

export async function logoutAdmin(raw?: string): Promise<void> {
  if (!raw) return;
  try {
    const { tokenHash } = await validateRefreshToken(raw);
    await revokeRefreshToken(tokenHash);
  } catch {
    // Token not found — proceed with logout anyway
  }
}

export async function getAdminProfile(adminId: string) {
  const admin = await Admin.findById(adminId).select("-passwordHash");
  if (!admin) throw new AppError(404, "NOT_FOUND", "Admin not found");
  return admin;
}

export async function forgotPasswordSendOtp(loginEmail: string): Promise<void> {
  const admin = await Admin.findOne({ loginEmail });
  if (!admin) return;

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
  } catch (err) {
    logger.warn({ err, adminId: admin._id }, "OTP email delivery failed — forgot password flow continues");
  }
}

export async function forgotPasswordReset(
  otpSessionId: string,
  otp: string,
  newPassword: string
): Promise<void> {
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

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS_PASSWORD);
  await Admin.findOneAndUpdate({ loginEmail: session.identifier }, { passwordHash, passwordChangedAt: new Date() });
  await OtpSession.deleteOne({ _id: session._id });
}

export async function resetPasswordSendOtp(adminId: string): Promise<void> {
  const admin = await Admin.findById(adminId);
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
  } catch (err) {
    logger.warn({ err, adminId }, "OTP email delivery failed — reset password flow continues");
  }
}

export async function resetPasswordConfirm(
  adminId: string,
  otpSessionId: string,
  otp: string,
  newPassword: string
): Promise<void> {
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

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS_PASSWORD);
  await Admin.findByIdAndUpdate(adminId, { passwordHash, passwordChangedAt: new Date() });
  await OtpSession.deleteOne({ _id: session._id });
}
