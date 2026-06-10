import type { RootState } from '../../app/store';

export const selectAdmin = (state: RootState) => state.auth.admin;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAccessToken = (state: RootState) => state.auth.accessToken;
