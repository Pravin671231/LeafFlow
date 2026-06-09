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

// Creates an OTP session and sends the OTP email. Email failure is non-fatal.
async function issueOtpSession(
  purpose: "admin_login" | "admin_forgot" | "admin_reset",
  identifier: string,
  deliveryEmail: string,
  adminId: Types.ObjectId
): Promise<string> {
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const session = await OtpSession.create({
    purpose,
    identifier,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attemptCount: 0,
  });
  try {
    await sendOtpEmail(deliveryEmail, otp);
  } catch (err) {
    logger.warn({ err, adminId }, `OTP email delivery failed — ${purpose} flow continues`);
  }
  return session._id.toString();
}

// Verifies an OTP session by ID + purpose. Returns the session identifier on success.
// Increments attemptCount on wrong OTP; deletes the session on success.
async function consumeOtpSession(
  otpSessionId: string,
  otp: string,
  purpose: string
): Promise<{ identifier: string }> {
  const session = await OtpSession.findById(otpSessionId);
  if (!session || session.purpose !== purpose) {
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

  await OtpSession.deleteOne({ _id: session._id });
  return { identifier: session.identifier };
}

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

  const otpSessionId = await issueOtpSession(
    "admin_login",
    loginEmail,
    admin.otpDeliveryEmail,
    admin._id as Types.ObjectId
  );

  return { otpSessionId, expiresInSeconds: OTP_TTL_SECONDS };
}

export async function verifyOtpAndIssueTokens(
  otpSessionId: string,
  otp: string
): Promise<{ accessToken: string; rawRefresh: string }> {
  const { identifier } = await consumeOtpSession(otpSessionId, otp, "admin_login");

  const admin = await Admin.findOne({ loginEmail: identifier });
  if (!admin) throw new AppError(401, "INVALID_OTP", "Admin not found");

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

  await issueOtpSession(
    "admin_forgot",
    loginEmail,
    admin.otpDeliveryEmail,
    admin._id as Types.ObjectId
  );
}

export async function forgotPasswordReset(
  otpSessionId: string,
  otp: string,
  newPassword: string
): Promise<void> {
  const { identifier } = await consumeOtpSession(otpSessionId, otp, "admin_forgot");
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS_PASSWORD);
  await Admin.findOneAndUpdate({ loginEmail: identifier }, { passwordHash, passwordChangedAt: new Date() });
}

export async function resetPasswordSendOtp(adminId: string): Promise<void> {
  const admin = await Admin.findById(adminId);
  if (!admin) throw new AppError(404, "NOT_FOUND", "Admin not found");

  await issueOtpSession(
    "admin_reset",
    admin.loginEmail,
    admin.otpDeliveryEmail,
    admin._id as Types.ObjectId
  );
}

export async function resetPasswordConfirm(
  adminId: string,
  otpSessionId: string,
  otp: string,
  newPassword: string
): Promise<void> {
  await consumeOtpSession(otpSessionId, otp, "admin_reset");
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS_PASSWORD);
  await Admin.findByIdAndUpdate(adminId, { passwordHash, passwordChangedAt: new Date() });
}
