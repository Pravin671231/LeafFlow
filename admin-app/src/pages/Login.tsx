import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../store/authApi';

export function Login() {
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [login, { isLoading }] = useLoginMutation();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const result = await login({ loginEmail, password }).unwrap();
      navigate('/login/verify-otp', {
        state: { otpSessionId: result.otpSessionId, loginEmail, password, expiresInSeconds: result.expiresInSeconds },
      });
    } catch {
      setError('Invalid credentials');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={loginEmail}
        onChange={(e) => setLoginEmail(e.target.value)}
      />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isLoading}>
        Sign In
      </button>
    </form>
  );
}
