import { z } from "zod";
import { OTP_LENGTH } from "../config/constants";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number");

export const loginSchema = z.object({
  loginEmail: z.email(),
  password: z.string().min(1),
});

export const verifyOtpSchema = z.object({
  otpSessionId: z.string().min(1),
  otp: z.string().length(OTP_LENGTH),
});

export const refreshSchema = z.object({});

export const forgotPasswordSendSchema = z.object({
  loginEmail: z.email(),
});

export const forgotPasswordResetSchema = z.object({
  otpSessionId: z.string().min(1),
  otp: z.string().length(OTP_LENGTH),
  newPassword: passwordSchema,
});

export const resetPasswordSendSchema = z.object({});

export const resetPasswordConfirmSchema = z.object({
  otpSessionId: z.string().min(1),
  otp: z.string().length(OTP_LENGTH),
  newPassword: passwordSchema,
});

export type LoginBody = z.infer<typeof loginSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
export type ForgotPasswordSendBody = z.infer<typeof forgotPasswordSendSchema>;
export type ForgotPasswordResetBody = z.infer<typeof forgotPasswordResetSchema>;
export type ResetPasswordConfirmBody = z.infer<typeof resetPasswordConfirmSchema>;
