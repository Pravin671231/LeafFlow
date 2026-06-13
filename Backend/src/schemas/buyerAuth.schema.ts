import { z } from "zod";
import { OTP_LENGTH } from "../config/constants";

export const sendOtpSchema = z.object({
  email: z.email(),
});

export const verifyBuyerOtpSchema = z.object({
  otpSessionId: z.string().min(1),
  otp: z.string().length(OTP_LENGTH),
});

export const googleOneTapSchema = z.object({
  credential: z.string().min(1),
});

export type SendOtpBody = z.infer<typeof sendOtpSchema>;
export type VerifyBuyerOtpBody = z.infer<typeof verifyBuyerOtpSchema>;
export type GoogleOneTapBody = z.infer<typeof googleOneTapSchema>;
