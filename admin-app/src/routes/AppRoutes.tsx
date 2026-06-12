import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthInitializer } from '../components/common/AuthInitializer';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { Login } from '../pages/Login';
import { LoginVerifyOtp } from '../pages/LoginVerifyOtp';
import { ForgotPassword } from '../pages/ForgotPassword';
import { Dashboard } from '../pages/Dashboard';
import { ResetPassword } from '../pages/ResetPassword';
import { ROUTES } from './routes';

export function AppRoutes() {
  return (
    <AuthInitializer>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.LOGIN_VERIFY_OTP} element={<LoginVerifyOtp />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
          <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Route>
      </Routes>
    </AuthInitializer>
  );
}
