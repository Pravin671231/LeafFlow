import { useNavigate } from 'react-router-dom';
import { clearCredentials } from './authSlice';
import { useLogoutMutation } from '../../api/authApi';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { ROUTES } from '../../routes/routes';

export function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { admin, isAuthenticated } = useAppSelector((state) => state.auth);
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  async function handleLogout() {
    try {
      await logout().unwrap();
    } catch {
      // always clear local state even if API fails
    }
    dispatch(clearCredentials());
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return { admin, isAuthenticated, handleLogout, isLoggingOut };
}
