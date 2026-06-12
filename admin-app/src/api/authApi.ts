import { baseApi } from './baseApi';
import type { Admin } from '../features/auth/authTypes';
import { AUTH_ENDPOINTS } from './endpoints';

// ─── Request / Response types ────────────────────────────────────────────────

interface LoginRequest {
  loginEmail: string;
  password: string;
}

interface LoginResponse {
  otpSessionId: string;
  expiresInSeconds: number;
}

interface VerifyOtpRequest {
  otpSessionId: string;
  otp: string;
}

interface VerifyOtpResponse {
  accessToken: string;
  admin: Admin;
}

interface ForgotPasswordSendOtpRequest {
  loginEmail: string;
}

interface ForgotPasswordSendOtpResponse {
  otpSessionId: string;
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

interface MessageResponse {
  message: string;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: AUTH_ENDPOINTS.LOGIN, method: 'POST', body }),
    }),

    verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpRequest>({
      query: (body) => ({ url: AUTH_ENDPOINTS.VERIFY_OTP, method: 'POST', body }),
    }),

    refresh: builder.mutation<{ accessToken: string }, void>({
      query: () => ({ url: AUTH_ENDPOINTS.REFRESH, method: 'POST' }),
    }),

    logout: builder.mutation<void, void>({
      query: () => ({ url: AUTH_ENDPOINTS.LOGOUT, method: 'POST' }),
    }),

    getMe: builder.query<Admin, void>({
      query: () => AUTH_ENDPOINTS.ME,
      transformResponse: (raw): Admin => {
        const d = raw as {
          _id?: string;
          id?: string;
          loginEmail: string;
          otpDeliveryEmail: string;
          name?: string;
          role?: string;
          isActive?: boolean;
          lastLoginAt?: string | null;
        };
        return {
          id: (d._id ?? d.id) as string,
          loginEmail: d.loginEmail,
          otpDeliveryEmail: d.otpDeliveryEmail,
          name: d.name ?? '',
          role: d.role ?? 'admin',
          isActive: d.isActive ?? true,
          lastLoginAt: d.lastLoginAt ?? null,
        };
      },
    }),

    forgotPasswordSendOtp: builder.mutation<
      ForgotPasswordSendOtpResponse,
      ForgotPasswordSendOtpRequest
    >({
      query: (body) => ({ url: AUTH_ENDPOINTS.FORGOT_PASSWORD_SEND_OTP, method: 'POST', body }),
    }),

    forgotPasswordReset: builder.mutation<MessageResponse, ForgotPasswordResetRequest>({
      query: (body) => ({ url: AUTH_ENDPOINTS.FORGOT_PASSWORD_RESET, method: 'POST', body }),
    }),

    resetPasswordSendOtp: builder.mutation<MessageResponse, void>({
      query: () => ({ url: AUTH_ENDPOINTS.RESET_PASSWORD_SEND_OTP, method: 'POST' }),
    }),

    resetPasswordConfirm: builder.mutation<MessageResponse, ResetPasswordConfirmRequest>({
      query: (body) => ({ url: AUTH_ENDPOINTS.RESET_PASSWORD_CONFIRM, method: 'POST', body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useVerifyOtpMutation,
  useRefreshMutation,
  useLogoutMutation,
  useGetMeQuery,
  useForgotPasswordSendOtpMutation,
  useForgotPasswordResetMutation,
  useResetPasswordSendOtpMutation,
  useResetPasswordConfirmMutation,
} = authApi;
