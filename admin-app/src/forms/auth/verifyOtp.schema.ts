import { z } from 'zod';

export const verifyOtpSchema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit code'),
});

export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;
