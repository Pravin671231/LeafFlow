import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { OTP_TTL_SECONDS } from "../config";
import { issueOtpSession } from "./otp.service";
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
