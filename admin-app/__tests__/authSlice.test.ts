import { describe, it, expect } from 'vitest';
import authReducer, { setCredentials, clearCredentials } from '../src/store/authSlice';
import type { Admin } from '../src/store/authSlice';

const mockAdmin: Admin = {
  id: '1',
  loginEmail: 'admin@leafflow.com',
  otpDeliveryEmail: 'pravin@gmail.com',
};

describe('authSlice', () => {
  // U1
  it('has correct initial state', () => {
    const state = authReducer(undefined, { type: '@@INIT' });
    expect(state).toEqual({ admin: null, isAuthenticated: false, accessToken: null });
  });

  // U2
  it('setCredentials populates admin, isAuthenticated, and accessToken', () => {
    const state = authReducer(
      undefined,
      setCredentials({ admin: mockAdmin, accessToken: 'tok' }),
    );
    expect(state.isAuthenticated).toBe(true);
    expect(state.admin).toEqual(mockAdmin);
    expect(state.accessToken).toBe('tok');
  });

  // U3
  it('clearCredentials resets authenticated state to initial', () => {
    const authenticated = { admin: mockAdmin, isAuthenticated: true, accessToken: 'tok' };
    const state = authReducer(authenticated, clearCredentials());
    expect(state).toEqual({ admin: null, isAuthenticated: false, accessToken: null });
  });
});
