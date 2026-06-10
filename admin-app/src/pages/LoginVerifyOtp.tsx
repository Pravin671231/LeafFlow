import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useVerifyOtpMutation } from '../store/authApi';
import { setCredentials } from '../store/authSlice';
import type { AppDispatch } from '../store/store';

interface LocationState {
  otpSessionId: string;
  loginEmail: string;
  expiresInSeconds?: number;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function LoginVerifyOtp() {
  const location = useLocation();
  const state = location.state as LocationState;
  const { otpSessionId, loginEmail, expiresInSeconds = 300 } = state ?? {};

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(expiresInSeconds);
  const [resendDisabled, setResendDisabled] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [verifyOtp, { isLoading }] = useVerifyOtpMutation();

  const resendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (resendTimerRef.current) clearTimeout(resendTimerRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const result = await verifyOtp({ loginEmail, otpSessionId, otp }).unwrap();
      dispatch(setCredentials({ admin: result.admin, accessToken: result.accessToken }));
      navigate('/dashboard');
    } catch {
      setError('Invalid OTP');
    }
  }

  function handleResend() {
    setResendDisabled(true);
    resendTimerRef.current = setTimeout(() => setResendDisabled(false), 60000);
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>Expires in: {formatCountdown(countdown)}</p>
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
      <button type="submit" disabled={isLoading}>
        Verify
      </button>
      <button type="button" disabled={resendDisabled} onClick={handleResend}>
        Resend
      </button>
    </form>
  );
}
