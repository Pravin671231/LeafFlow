import { Admin } from "../models/Admin";
import { AppError } from "../utils/AppError";

import { LOCK_DURATION_MS, MAX_FAILED_ATTEMPTS, OTP_TTL_SECONDS } from "../config";
import { consumeOtpSession, issueOtpSession } from "./otp.service";
import { hashPassword, verifyPassword } from "../utils/shared/password.utils";
import { generateAccessToken, generateRefreshToken } from "./token.service";
import { storeRefreshToken, validateRefreshToken, revokeRefreshToken } from "./refreshToken.service";

export async function login(
  loginEmail: string,
  password: string
): Promise<{ otpSessionId: string; expiresInSeconds: number }> {
  const admin = await Admin.findOne({ loginEmail });
  if (!admin) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");

  if (admin.lockUntil && admin.lockUntil > new Date()) {
    throw new AppError(403, "ACCOUNT_LOCKED", "Account is temporarily locked");
  }

  const valid = await verifyPassword(password, admin.passwordHash);
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

  const otpSessionId = await issueOtpSession("admin_login", loginEmail, admin.otpDeliveryEmail);

  return { otpSessionId, expiresInSeconds: OTP_TTL_SECONDS };
}

export async function verifyOtpAndIssueTokens(
  otpSessionId: string,
  otp: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const { identifier } = await consumeOtpSession(otpSessionId, otp, "admin_login");

  const admin = await Admin.findOne({ loginEmail: identifier });
  if (!admin) throw new AppError(401, "INVALID_OTP", "Admin not found");

  const payload = { id: admin._id.toString(), role: "admin" };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await storeRefreshToken(refreshToken, admin._id.toString(), "admin");

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(raw: string): Promise<{ accessToken: string }> {
  let adminId: string;
  try {
    const result = await validateRefreshToken(raw);
    adminId = result.adminId;
  } catch {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
  }
  const accessToken = generateAccessToken({ id: adminId, role: "admin" });
  return { accessToken };
}

export async function logoutAdmin(raw?: string): Promise<void> {
  if (!raw) return;
  try {
    const { tokenHash } = await validateRefreshToken(raw);
    await revokeRefreshToken(tokenHash);
  } catch {
    // Token not found or invalid — proceed with logout anyway
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

  await issueOtpSession("admin_forgot", loginEmail, admin.otpDeliveryEmail);
}

export async function forgotPasswordReset(
  otpSessionId: string,
  otp: string,
  newPassword: string
): Promise<void> {
  const { identifier } = await consumeOtpSession(otpSessionId, otp, "admin_forgot");
  const passwordHash = await hashPassword(newPassword);
  await Admin.findOneAndUpdate(
    { loginEmail: identifier },
    { passwordHash, passwordChangedAt: new Date() }
  );
}

export async function resetPasswordSendOtp(adminId: string): Promise<void> {
  const admin = await Admin.findById(adminId);
  if (!admin) throw new AppError(404, "NOT_FOUND", "Admin not found");

  await issueOtpSession("admin_reset", admin.loginEmail, admin.otpDeliveryEmail);
}

export async function resetPasswordConfirm(
  adminId: string,
  otpSessionId: string,
  otp: string,
  newPassword: string
): Promise<void> {
  await consumeOtpSession(otpSessionId, otp, "admin_reset");
  const passwordHash = await hashPassword(newPassword);
  await Admin.findByIdAndUpdate(adminId, { passwordHash, passwordChangedAt: new Date() });
}
