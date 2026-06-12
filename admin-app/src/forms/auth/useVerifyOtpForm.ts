import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyOtpSchema, type VerifyOtpFormValues } from './verifyOtp.schema';
import { useVerifyOtpMutation } from '../../api/authApi';
import { setCredentials } from '../../features/auth/authSlice';
import { useAppDispatch } from '../../app/hooks';
import { ROUTES } from '../../routes/routes';

interface LocationState {
  otpSessionId: string;
  loginEmail: string;
  expiresInSeconds?: number;
}

export function useVerifyOtpForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const state = location.state as LocationState;
  const { otpSessionId, expiresInSeconds = 300 } = state ?? {};

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [apiError, setApiError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const resendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [verifyOtp, { isLoading }] = useVerifyOtpMutation();

  const form = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otp: '' },
  });

  function updateDigit(index: number, value: string, refs: React.RefObject<HTMLInputElement | null>[]) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    form.setValue('otp', next.join(''), { shouldValidate: true });

    if (digit && index < 5) {
      refs[index + 1]?.current?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>, refs: React.RefObject<HTMLInputElement | null>[]) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1]?.current?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent, refs: React.RefObject<HTMLInputElement | null>[]) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(6).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    form.setValue('otp', next.join(''), { shouldValidate: true });
    const focusIdx = Math.min(pasted.length, 5);
    refs[focusIdx]?.current?.focus();
  }

  async function onSubmit() {
    setApiError('');
    const otp = digits.join('');
    try {
      const result = await verifyOtp({ otpSessionId, otp }).unwrap();
      dispatch(setCredentials({ admin: result.admin, accessToken: result.accessToken }));
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      const e = err as { data?: { message?: string } };
      setApiError(e?.data?.message ?? 'Invalid OTP');
    }
  }

  function handleResend() {
    setResendDisabled(true);
    if (resendTimerRef.current) clearTimeout(resendTimerRef.current);
    resendTimerRef.current = setTimeout(() => setResendDisabled(false), 60000);
  }

  return {
    form,
    digits,
    updateDigit,
    handleKeyDown,
    handlePaste,
    onSubmit,
    isLoading,
    apiError,
    expiresInSeconds,
    resendDisabled,
    handleResend,
  };
}
