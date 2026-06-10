import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Admin } from './authSlice';

interface LoginRequest {
  loginEmail: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  otpSessionId: string;
  expiresInSeconds: number;
  message: string;
}

interface VerifyOtpRequest {
  loginEmail: string;
  otpSessionId: string;
  otp: string;
}

interface VerifyOtpResponse {
  success: boolean;
  accessToken: string;
  admin: Admin;
}

interface ForgotPasswordSendOtpRequest {
  loginEmail: string;
}

interface ForgotPasswordSendOtpResponse {
  success: boolean;
  otpSessionId: string;
  message: string;
}

interface ForgotPasswordResetRequest {
  loginEmail: string;
  otpSessionId: string;
  otp: string;
  newPassword: string;
}

interface ResetPasswordConfirmRequest {
  otpSessionId: string;
  otp: string;
  newPassword: string;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/admin/auth' }),
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: '/login', method: 'POST', body }),
    }),
    verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpRequest>({
      query: (body) => ({ url: '/login/verify-otp', method: 'POST', body }),
    }),
    refresh: builder.mutation<{ accessToken: string }, void>({
      query: () => ({ url: '/refresh', method: 'POST' }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/logout', method: 'POST' }),
    }),
    me: builder.query<{ admin: Admin }, void>({
      query: () => '/me',
    }),
    forgotPasswordSendOtp: builder.mutation<ForgotPasswordSendOtpResponse, ForgotPasswordSendOtpRequest>({
      query: (body) => ({ url: '/forgot-password/send-otp', method: 'POST', body }),
    }),
    forgotPasswordReset: builder.mutation<{ success: boolean }, ForgotPasswordResetRequest>({
      query: (body) => ({ url: '/forgot-password/reset', method: 'POST', body }),
    }),
    resetPasswordSendOtp: builder.mutation<ForgotPasswordSendOtpResponse, void>({
      query: () => ({ url: '/reset-password/send-otp', method: 'POST' }),
    }),
    resetPasswordConfirm: builder.mutation<{ success: boolean }, ResetPasswordConfirmRequest>({
      query: (body) => ({ url: '/reset-password/confirm', method: 'POST', body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useVerifyOtpMutation,
  useRefreshMutation,
  useLogoutMutation,
  useMeQuery,
  useForgotPasswordSendOtpMutation,
  useForgotPasswordResetMutation,
  useResetPasswordSendOtpMutation,
  useResetPasswordConfirmMutation,
} = authApi;
