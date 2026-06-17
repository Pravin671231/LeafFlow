import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { OTP_TTL_SECONDS } from "../config";
import { issueOtpSession, consumeOtpSession } from "./otp.service";
import { generateAccessToken, generateRefreshToken } from "./token.service";
import { storeRefreshToken } from "./refreshToken.service";
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
