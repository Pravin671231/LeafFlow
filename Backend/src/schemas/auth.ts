import { z } from "zod";

export const loginSchema = z.object({
  loginEmail: z.string().email(),
  password: z.string().min(1),
});

export const verifyOtpSchema = z.object({
  otpSessionId: z.string().min(1),
  otp: z.string().length(6),
});

export const refreshSchema = z.object({});

export const forgotPasswordSendSchema = z.object({
  loginEmail: z.string().email(),
});

export const forgotPasswordResetSchema = z.object({
  otpSessionId: z.string().min(1),
  otp: z.string().length(6),
  newPassword: z.string().min(8),
});

export const resetPasswordSendSchema = z.object({});

export const resetPasswordConfirmSchema = z.object({
  otpSessionId: z.string().min(1),
  otp: z.string().length(6),
  newPassword: z.string().min(8),
});

export type LoginBody = z.infer<typeof loginSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
export type ForgotPasswordSendBody = z.infer<typeof forgotPasswordSendSchema>;
export type ForgotPasswordResetBody = z.infer<typeof forgotPasswordResetSchema>;
export type ResetPasswordConfirmBody = z.infer<typeof resetPasswordConfirmSchema>;
