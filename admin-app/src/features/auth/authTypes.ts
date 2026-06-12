export interface Admin {
  id: string;
  loginEmail: string;
  otpDeliveryEmail: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface AuthState {
  admin: Admin | null;
  isAuthenticated: boolean;
  accessToken: string | null;
}
