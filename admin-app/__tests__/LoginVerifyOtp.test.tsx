import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../src/mocks/server';
import { renderWithProviders } from './testUtils';
import { LoginVerifyOtp } from '../src/pages/LoginVerifyOtp';

const BASE = 'http://localhost:3000/api/admin/auth';

const mockAdmin = {
  id: '1',
  loginEmail: 'admin@leafflow.com',
  otpDeliveryEmail: 'pravin@gmail.com',
};

// Wrap LoginVerifyOtp with location state (otpSessionId + loginEmail)
import { useNavigate } from 'react-router-dom';
function OtpPageWrapper() {
  const navigate = useNavigate();
  // Simulate arriving with location.state set
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <button
            onClick={() =>
              navigate('/login/verify-otp', {
                state: { otpSessionId: 'sess1', loginEmail: 'admin@leafflow.com' },
              })
            }
          >
            Go to OTP
          </button>
        }
      />
      <Route path="/login/verify-otp" element={<LoginVerifyOtp />} />
      <Route path="/dashboard" element={<div>Dashboard</div>} />
    </Routes>
  );
}

describe('LoginVerifyOtp page', () => {
  afterEach(() => vi.useRealTimers());

  // I5
  it('renders OTP input, submit button, and countdown', async () => {
    renderWithProviders(<OtpPageWrapper />, { initialEntries: ['/login'] });

    await userEvent.click(screen.getByRole('button', { name: /go to otp/i }));

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /otp|verification code/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /verify|submit/i })).toBeInTheDocument();
    expect(screen.getByText(/\d:\d\d/)).toBeInTheDocument();
  });

  // I6
  it('dispatches setCredentials and navigates to /dashboard on valid OTP', async () => {
    server.use(
      http.post(`${BASE}/login/verify-otp`, () =>
        HttpResponse.json({ success: true, accessToken: 'jwt', admin: mockAdmin }),
      ),
    );

    const { store } = renderWithProviders(<OtpPageWrapper />, { initialEntries: ['/login'] });

    await userEvent.click(screen.getByRole('button', { name: /go to otp/i }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /otp|verification code/i })).toBeInTheDocument(),
    );
    await userEvent.type(screen.getByRole('textbox', { name: /otp|verification code/i }), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify|submit/i }));

    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  // I7
  it('shows error message on invalid OTP', async () => {
    server.use(
      http.post(`${BASE}/login/verify-otp`, () =>
        HttpResponse.json(
          { success: false, code: 'OTP_INVALID', message: 'Invalid OTP' },
          { status: 400 },
        ),
      ),
    );

    renderWithProviders(<OtpPageWrapper />, { initialEntries: ['/login'] });

    await userEvent.click(screen.getByRole('button', { name: /go to otp/i }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /otp|verification code/i })).toBeInTheDocument(),
    );
    await userEvent.type(screen.getByRole('textbox', { name: /otp|verification code/i }), '000000');
    await userEvent.click(screen.getByRole('button', { name: /verify|submit/i }));

    await waitFor(() => expect(screen.getByText(/invalid otp/i)).toBeInTheDocument());
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  // I8 — use fireEvent (sync) + act to avoid userEvent timer-advancing loop under fake timers
  it('resend button is disabled for 60s then re-enables', async () => {
    vi.useFakeTimers();

    renderWithProviders(
      <Routes>
        <Route path="/login/verify-otp" element={<LoginVerifyOtp />} />
      </Routes>,
      {
        initialEntries: [
          { pathname: '/login/verify-otp', state: { otpSessionId: 'sess1', loginEmail: 'admin@leafflow.com', password: 'pass' } },
        ],
      },
    );

    const resend = screen.getByRole('button', { name: /resend/i });

    await act(async () => {
      fireEvent.click(resend);
    });
    expect(resend).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(60000);
    });
    expect(resend).not.toBeDisabled();
  });
});
