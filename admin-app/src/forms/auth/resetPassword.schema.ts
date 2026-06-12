import { z } from 'zod';
import { passwordSchema } from '../shared/password.schema';

export const resetPasswordSchema = z
  .object({
    otp: z.string().length(6, 'Enter the 6-digit code'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
