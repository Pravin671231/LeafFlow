export const AUTH_ENDPOINTS = {
  LOGIN:                    '/login',
  VERIFY_OTP:               '/login/verify-otp',
  REFRESH:                  '/refresh',
  LOGOUT:                   '/logout',
  ME:                       '/me',
  FORGOT_PASSWORD_SEND_OTP: '/forgot-password/send-otp',
  FORGOT_PASSWORD_RESET:    '/forgot-password/reset',
  RESET_PASSWORD_SEND_OTP:  '/reset-password/send-otp',
  RESET_PASSWORD_CONFIRM:   '/reset-password/confirm',
} as const;
