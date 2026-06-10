import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../src/mocks/server';
import { renderWithProviders } from './testUtils';
import { Login } from '../src/pages/Login';

const BASE = 'http://localhost:3000/api/admin/auth';

describe('Login page', () => {
  // I1
  it('renders email field, password field, and submit button', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>,
      { initialEntries: ['/login'] },
    );

    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in|log in|submit/i })).toBeInTheDocument();
  });

  // I2
  it('navigates to /login/verify-otp on valid credentials', async () => {
    server.use(
      http.post(`${BASE}/login`, () =>
        HttpResponse.json({
          success: true,
          otpSessionId: 'sess1',
          message: 'OTP sent to registered email.',
          expiresInSeconds: 300,
        }),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/login/verify-otp" element={<div>OTP Page</div>} />
      </Routes>,
      { initialEntries: ['/login'] },
    );

    await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'admin@leafflow.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /sign in|log in|submit/i }));

    await waitFor(() => expect(screen.getByText('OTP Page')).toBeInTheDocument());
  });

  // I3
  it('shows inline error on invalid credentials and stays on /login', async () => {
    server.use(
      http.post(`${BASE}/login`, () =>
        HttpResponse.json(
          { success: false, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
          { status: 401 },
        ),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/login/verify-otp" element={<div>OTP Page</div>} />
      </Routes>,
      { initialEntries: ['/login'] },
    );

    await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'admin@leafflow.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in|log in|submit/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText('OTP Page')).not.toBeInTheDocument();
  });

  // I4
  it('does not call API when form is empty', async () => {
    const handler = vi.fn();
    server.use(http.post(`${BASE}/login`, handler));

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>,
      { initialEntries: ['/login'] },
    );

    await userEvent.click(screen.getByRole('button', { name: /sign in|log in|submit/i }));

    await new Promise((r) => setTimeout(r, 50));
    expect(handler).not.toHaveBeenCalled();
  });
});
