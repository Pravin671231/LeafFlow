import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForgotPasswordSendOtpMutation, useForgotPasswordResetMutation } from '../store/authApi';

export function ForgotPassword() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loginEmail, setLoginEmail] = useState('');
  const [otpSessionId, setOtpSessionId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const [sendOtp, { isLoading: isSending }] = useForgotPasswordSendOtpMutation();
  const [resetPassword, { isLoading: isResetting }] = useForgotPasswordResetMutation();

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const result = await sendOtp({ loginEmail }).unwrap();
      setOtpSessionId(result.otpSessionId);
      setStep(2);
    } catch {
      setError('Failed to send OTP. Please try again.');
    }
  }

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setStep(3);
  }

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await resetPassword({ loginEmail, otpSessionId, otp, newPassword }).unwrap();
      navigate('/login');
    } catch {
      setError('Failed to reset password. Please try again.');
    }
  }

  return (
    <div>
      {step === 1 && (
        <form onSubmit={handleStep1}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={isSending}>
            Send OTP
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleStep2}>
          <label htmlFor="otp">Verification Code</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          {error && <p role="alert">{error}</p>}
          <button type="submit">Verify</button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleStep3}>
          <label htmlFor="new-password">New Password</label>
          <input
            id="new-password"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            id="confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={isResetting}>
            Reset
          </button>
        </form>
      )}
    </div>
  );
}
