import { z } from "zod";

export const sendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type SendOtpBody = z.infer<typeof sendOtpSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
