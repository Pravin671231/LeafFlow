import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  forgotPasswordEmailSchema,
  forgotPasswordResetSchema,
  type ForgotPasswordEmailValues,
  type ForgotPasswordResetValues,
} from './forgotPassword.schema';
import {
  useForgotPasswordSendOtpMutation,
  useForgotPasswordResetMutation,
} from '../../api/authApi';

export function useForgotPasswordForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [otpSessionId, setOtpSessionId] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [apiError, setApiError] = useState('');

  const [sendOtp, { isLoading: isSending }] = useForgotPasswordSendOtpMutation();
  const [resetPassword, { isLoading: isResetting }] = useForgotPasswordResetMutation();

  const emailForm = useForm<ForgotPasswordEmailValues>({
    resolver: zodResolver(forgotPasswordEmailSchema),
  });

  const resetForm = useForm<ForgotPasswordResetValues>({
    resolver: zodResolver(forgotPasswordResetSchema),
  });

  async function onSubmitEmail(data: ForgotPasswordEmailValues) {
    setApiError('');
    try {
      const result = await sendOtp({ loginEmail: data.loginEmail }).unwrap();
      setOtpSessionId(result.otpSessionId);
      setLoginEmail(data.loginEmail);
      setStep(2);
    } catch (err) {
      const e = err as { data?: { message?: string } };
      setApiError(e?.data?.message ?? 'Failed to send OTP. Please try again.');
    }
  }

  function onSubmitOtp(data: { otp: string }) {
    // Store OTP in resetForm before advancing to step 3
    resetForm.setValue('otp', data.otp);
    setStep(3);
  }

  async function onSubmitReset(data: ForgotPasswordResetValues) {
    setApiError('');
    try {
      await resetPassword({
        loginEmail,
        otpSessionId,
        otp: data.otp,
        newPassword: data.newPassword,
      }).unwrap();
      navigate('/login');
    } catch (err) {
      const e = err as { data?: { message?: string } };
      setApiError(e?.data?.message ?? 'Failed to reset password. Please try again.');
    }
  }

  return {
    step,
    emailForm,
    resetForm,
    onSubmitEmail,
    onSubmitOtp,
    onSubmitReset,
    isSending,
    isResetting,
    apiError,
  };
}
