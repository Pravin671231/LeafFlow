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
  message: string;
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

interface MessageResponse {
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unwrapData(raw: unknown): Record<string, unknown> {
  const r = raw as Record<string, unknown>;
  return (r.data ?? r) as Record<string, unknown>;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: AUTH_ENDPOINTS.LOGIN, method: 'POST', body }),
      transformResponse: (raw): LoginResponse => {
        const d = unwrapData(raw);
        const r = raw as Record<string, unknown>;
        return {
          otpSessionId: (d.otpSessionId ?? r.otpSessionId) as string,
          expiresInSeconds: ((d.expiresInSeconds ?? r.expiresInSeconds) ?? 300) as number,
          message: (r.message ?? '') as string,
        };
      },
    }),

    verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpRequest>({
      query: (body) => ({ url: AUTH_ENDPOINTS.VERIFY_OTP, method: 'POST', body }),
      transformResponse: (raw): VerifyOtpResponse => {
        const d = unwrapData(raw);
        const r = raw as Record<string, unknown>;
        return {
          accessToken: (d.accessToken ?? r.accessToken) as string,
          admin: (d.admin ?? r.admin) as Admin,
        };
      },
    }),

    refresh: builder.mutation<{ accessToken: string }, void>({
      query: () => ({ url: AUTH_ENDPOINTS.REFRESH, method: 'POST' }),
      transformResponse: (raw): { accessToken: string } => {
        const d = unwrapData(raw);
        const r = raw as Record<string, unknown>;
        return { accessToken: (d.accessToken ?? r.accessToken) as string };
      },
    }),

    logout: builder.mutation<void, void>({
      query: () => ({ url: AUTH_ENDPOINTS.LOGOUT, method: 'POST' }),
    }),

    getMe: builder.query<Admin, void>({
      query: () => AUTH_ENDPOINTS.ME,
      transformResponse: (raw): Admin => {
        const d = unwrapData(raw);
        return {
          id: (d._id ?? d.id) as string,
          loginEmail: d.loginEmail as string,
          otpDeliveryEmail: d.otpDeliveryEmail as string,
          name: (d.name ?? '') as string,
          role: (d.role ?? 'admin') as string,
          isActive: (d.isActive ?? true) as boolean,
          lastLoginAt: (d.lastLoginAt ?? null) as string | null,
        };
      },
    }),

    forgotPasswordSendOtp: builder.mutation<
      ForgotPasswordSendOtpResponse,
      ForgotPasswordSendOtpRequest
    >({
      query: (body) => ({ url: AUTH_ENDPOINTS.FORGOT_PASSWORD_SEND_OTP, method: 'POST', body }),
      transformResponse: (raw): ForgotPasswordSendOtpResponse => {
        const d = unwrapData(raw);
        const r = raw as Record<string, unknown>;
        return {
          otpSessionId: (d.otpSessionId ?? r.otpSessionId ?? '') as string,
          message: (r.message ?? '') as string,
        };
      },
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
