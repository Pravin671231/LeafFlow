import { z } from 'zod';
import { passwordSchema } from '../shared/password.schema';

export const forgotPasswordEmailSchema = z.object({
  loginEmail: z.string().email('Enter a valid email'),
});

export const forgotPasswordResetSchema = z
  .object({
    otp: z.string().length(6, 'Enter the 6-digit code'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ForgotPasswordEmailValues = z.infer<typeof forgotPasswordEmailSchema>;
export type ForgotPasswordResetValues = z.infer<typeof forgotPasswordResetSchema>;
