import { User, IUser } from "../models/User";
import { AppError } from "../utils/AppError";
import { OTP_TTL_SECONDS } from "../config";
import { issueOtpSession, consumeOtpSession } from "./otp.service";
import { generateAccessToken, generateRefreshToken } from "./token.service";
import { storeRefreshToken, validateRefreshToken, revokeRefreshToken } from "./refreshToken.service";
import { verifyGoogleCode, verifyGoogleOneTap } from "./integrations/google.service";
import { createLogger } from "../utils/logger";

const log = createLogger("buyerAuth");

export async function sendEmailOtp(
  email: string
): Promise<{ otpSessionId: string; expiresInSeconds: number }> {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, isVerified: false });
    log.info({ email }, "New buyer created");
  }

  const otpSessionId = await issueOtpSession("buyer_login", email, email);
  return { otpSessionId, expiresInSeconds: OTP_TTL_SECONDS };
}

export async function verifyEmailOtp(
  otpSessionId: string,
  otp: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const { identifier } = await consumeOtpSession(otpSessionId, otp, "buyer_login");

  const user = await User.findOne({ email: identifier });
  if (!user) throw new AppError(401, "INVALID_OTP", "User not found");

  user.isVerified = true;
  await user.save();

  const payload = { id: user._id.toString(), role: "buyer" };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await storeRefreshToken(refreshToken, user._id.toString(), "buyer");

  return { accessToken, refreshToken };
}

export async function refreshBuyerAccessToken(raw: string): Promise<{ accessToken: string }> {
  let id: string;
  try {
    const result = await validateRefreshToken(raw);
    id = result.id;
  } catch {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
  }
  const accessToken = generateAccessToken({ id, role: "buyer" });
  return { accessToken };
}

export async function logoutBuyer(raw?: string): Promise<void> {
  if (!raw) return;
  try {
    const { tokenHash } = await validateRefreshToken(raw);
    await revokeRefreshToken(tokenHash);
  } catch {
    // Token not found or invalid — proceed with logout anyway
  }
}

export async function getBuyerProfile(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
  return user;
}

async function findOrCreateBuyer(
  email: string,
  googleId: string,
  name?: string
): Promise<IUser> {
  const byGoogleId = await User.findOne({ googleId });
  if (byGoogleId) return byGoogleId;

  const byEmail = await User.findOne({ email });
  if (byEmail) {
    byEmail.googleId = googleId;
    byEmail.isVerified = true;
    await byEmail.save();
    return byEmail;
  }

  return User.create({ email, googleId, name, isVerified: true });
}

async function issueGoogleTokens(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = { id: user._id.toString(), role: "buyer" };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  await storeRefreshToken(refreshToken, user._id.toString(), "buyer");
  return { accessToken, refreshToken };
}

export async function handleGoogleCallback(
  code: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const profile = await verifyGoogleCode(code);
  const user = await findOrCreateBuyer(profile.email, profile.googleId, profile.name);
  return issueGoogleTokens(user);
}

export async function handleOneTap(
  credential: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const profile = await verifyGoogleOneTap(credential);
  const user = await findOrCreateBuyer(profile.email, profile.googleId, profile.name);
  return issueGoogleTokens(user);
}
