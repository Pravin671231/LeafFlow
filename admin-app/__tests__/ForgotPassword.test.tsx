import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../src/mocks/server';
import { renderWithProviders } from './testUtils';
import { ForgotPassword } from '../src/pages/ForgotPassword';

const BASE = 'http://localhost:3000/api/admin/auth';

function ForgotPasswordWrapper() {
  return (
    <Routes>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/login" element={<div>Login Page</div>} />
    </Routes>
  );
}

describe('ForgotPassword page', () => {
  // I9
  it('renders email input and Send OTP button on step 1', () => {
    renderWithProviders(<ForgotPasswordWrapper />, { initialEntries: ['/forgot-password'] });

    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument();
  });

  // I10
  it('advances to step 2 (OTP entry) after submitting email', async () => {
    server.use(
      http.post(`${BASE}/forgot-password/send-otp`, () =>
        HttpResponse.json({ success: true, message: 'OTP sent', data: { otpSessionId: 'sess2' } }),
      ),
    );

    renderWithProviders(<ForgotPasswordWrapper />, { initialEntries: ['/forgot-password'] });

    await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'admin@leafflow.com');
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }));

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /otp|verification code/i })).toBeInTheDocument(),
    );
  });

  // I11
  it('advances to step 3 (new password) after submitting OTP', async () => {
    server.use(
      http.post(`${BASE}/forgot-password/send-otp`, () =>
        HttpResponse.json({ success: true, message: 'OTP sent', data: { otpSessionId: 'sess2' } }),
      ),
    );

    renderWithProviders(<ForgotPasswordWrapper />, { initialEntries: ['/forgot-password'] });

    // Step 1
    await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'admin@leafflow.com');
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }));
    await waitFor(() => screen.getByRole('textbox', { name: /otp|verification code/i }));

    // Step 2
    await userEvent.type(screen.getByRole('textbox', { name: /otp|verification code/i }), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify|next/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  // I12
  it('navigates to /login on matching passwords and successful reset', async () => {
    server.use(
      http.post(`${BASE}/forgot-password/send-otp`, () =>
        HttpResponse.json({ success: true, message: 'OTP sent', data: { otpSessionId: 'sess2' } }),
      ),
      http.post(`${BASE}/forgot-password/reset`, () =>
        HttpResponse.json({ success: true, message: 'Password reset successfully' }),
      ),
    );

    renderWithProviders(<ForgotPasswordWrapper />, { initialEntries: ['/forgot-password'] });

    // Step 1
    await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'admin@leafflow.com');
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }));
    await waitFor(() => screen.getByRole('textbox', { name: /otp|verification code/i }));

    // Step 2
    await userEvent.type(screen.getByRole('textbox', { name: /otp|verification code/i }), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify|next/i }));
    await waitFor(() => screen.getByLabelText(/new password/i));

    // Step 3
    await userEvent.type(screen.getByLabelText(/new password/i), 'NewPass123!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'NewPass123!');
    await userEvent.click(screen.getByRole('button', { name: /reset|submit/i }));

    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
  });

  // I13
  it('shows error and does not call API when passwords do not match', async () => {
    server.use(
      http.post(`${BASE}/forgot-password/send-otp`, () =>
        HttpResponse.json({ success: true, message: 'OTP sent', data: { otpSessionId: 'sess2' } }),
      ),
    );

    const resetHandler = vi.fn();
    server.use(http.post(`${BASE}/forgot-password/reset`, resetHandler));

    renderWithProviders(<ForgotPasswordWrapper />, { initialEntries: ['/forgot-password'] });

    // Step 1
    await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'admin@leafflow.com');
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }));
    await waitFor(() => screen.getByRole('textbox', { name: /otp|verification code/i }));

    // Step 2
    await userEvent.type(screen.getByRole('textbox', { name: /otp|verification code/i }), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify|next/i }));
    await waitFor(() => screen.getByLabelText(/new password/i));

    // Step 3 — mismatched
    await userEvent.type(screen.getByLabelText(/new password/i), 'NewPass123!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Different456!');
    await userEvent.click(screen.getByRole('button', { name: /reset|submit/i }));

    await waitFor(() =>
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument(),
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(resetHandler).not.toHaveBeenCalled();
  });
});
