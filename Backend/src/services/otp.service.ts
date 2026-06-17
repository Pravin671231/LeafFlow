import { MAX_OTP_ATTEMPTS, OTP_TTL_MS } from "../config";
import { AppError, createLogger, generateOtp, hashOtp, verifyOtp } from "../utils";
import { OtpSession } from "../models";
import { sendOtpEmail } from "./integrations/email.service";

const log = createLogger("otp");

export async function issueOtpSession(
  purpose: "admin_login" | "admin_forgot" | "admin_reset",
  identifier: string,
  deliveryEmail: string
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
    return session._id.toString();
  } catch (err) {
    await OtpSession.deleteOne({ _id: session._id });
    log.warn({ err, identifier, purpose }, `OTP email delivery failed — ${purpose} flow continues`);
    throw new AppError(503, "EMAIL_DELIVERY_FAILED", "Failed to send OTP. Please try again.");
  }
}

export async function consumeOtpSession(
  otpSessionId: string,
  otp: string,
  purpose: string
): Promise<{ identifier: string }> {
  const session = await OtpSession.findById(otpSessionId);
  if (!session || session.purpose !== purpose) {
    throw new AppError(401, "INVALID_OTP", "Invalid OTP session");
  }
  if (session.expiresAt < new Date()) throw new AppError(401, "OTP_EXPIRED", "OTP has expired");
  if (session.attemptCount >= MAX_OTP_ATTEMPTS)
    throw new AppError(429, "OTP_MAX_ATTEMPTS", "Too many attempts");

  const valid = await verifyOtp(otp, session.otpHash);
  if (!valid) {
    session.attemptCount += 1;
    await session.save();
    throw new AppError(401, "INVALID_OTP", "Invalid OTP");
  }

  await OtpSession.deleteOne({ _id: session._id });
  return { identifier: session.identifier };
}

export { hashOtp } from "../utils";
