import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Admin, AuthState } from './authTypes';

function getPersistedAdmin(): Admin | null {
  try {
    const raw = sessionStorage.getItem('leafflow_admin');
    return raw ? (JSON.parse(raw) as Admin) : null;
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  admin: getPersistedAdmin(),
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
      try {
        sessionStorage.setItem('leafflow_admin', JSON.stringify(action.payload.admin));
      } catch {
        // ignore storage errors
      }
    },
    clearCredentials(state) {
      state.admin = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      try {
        sessionStorage.removeItem('leafflow_admin');
      } catch {
        // ignore storage errors
      }
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
