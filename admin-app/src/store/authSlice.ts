import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Admin {
  id: string;
  loginEmail: string;
  otpDeliveryEmail: string;
}

export interface AuthState {
  admin: Admin | null;
  isAuthenticated: boolean;
  accessToken: string | null;
}

const initialState: AuthState = {
  admin: null,
  isAuthenticated: false,
  accessToken: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ admin: Admin; accessToken: string }>) {
      state.admin = action.payload.admin;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
    },
    clearCredentials(state) {
      state.admin = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
