import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { loginSchema, type LoginFormValues } from './login.schema';
import { useLoginMutation } from '../../api/authApi';
import { ROUTES } from '../../routes/routes';

export function useLoginForm() {
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [apiError, setApiError] = useState('');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormValues) {
    setApiError('');
    try {
      const result = await login(data).unwrap();
      navigate(ROUTES.LOGIN_VERIFY_OTP, {
        state: {
          otpSessionId: result.otpSessionId,
          loginEmail: data.loginEmail,
          expiresInSeconds: result.expiresInSeconds,
        },
      });
    } catch (err) {
      const e = err as { data?: { message?: string } };
      setApiError(e?.data?.message ?? 'Invalid credentials');
    }
  }

  return { form, onSubmit, isLoading, apiError };
}
