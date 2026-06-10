import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordValues } from './resetPassword.schema';
import {
  useResetPasswordSendOtpMutation,
  useResetPasswordConfirmMutation,
} from '../../api/authApi';

export function useResetPasswordForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [otpSessionId, setOtpSessionId] = useState('');
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);

  const [sendOtp, { isLoading: isSending }] = useResetPasswordSendOtpMutation();
  const [confirmReset, { isLoading: isConfirming }] = useResetPasswordConfirmMutation();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSendOtp() {
    setApiError('');
    try {
      const result = await sendOtp().unwrap();
      const r = result as unknown as { otpSessionId?: string };
      setOtpSessionId(r.otpSessionId ?? '');
      setStep(2);
    } catch (err) {
      const e = err as { data?: { message?: string } };
      setApiError(e?.data?.message ?? 'Failed to send OTP. Please try again.');
    }
  }

  async function onSubmit(data: ResetPasswordValues) {
    setApiError('');
    try {
      await confirmReset({
        otpSessionId,
        otp: data.otp,
        newPassword: data.newPassword,
      }).unwrap();
      setSuccess(true);
    } catch (err) {
      const e = err as { data?: { message?: string } };
      setApiError(e?.data?.message ?? 'Failed to update password.');
    }
  }

  return {
    step,
    form,
    onSendOtp,
    onSubmit,
    isSending,
    isConfirming,
    apiError,
    success,
  };
}
