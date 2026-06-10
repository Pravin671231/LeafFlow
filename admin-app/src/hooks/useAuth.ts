import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectAdmin, selectIsAuthenticated } from '../features/auth/authSelectors';
import { clearCredentials } from '../features/auth/authSlice';
import { useLogoutMutation } from '../api/authApi';
import type { AppDispatch } from '../app/store';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const admin = useSelector(selectAdmin);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  async function handleLogout() {
    try {
      await logout().unwrap();
    } catch {
      // always clear local state even if API fails
    }
    dispatch(clearCredentials());
    navigate('/login', { replace: true });
  }

  return { admin, isAuthenticated, handleLogout, isLoggingOut };
}
