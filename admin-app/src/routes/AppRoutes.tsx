import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthInitializer } from '../components/common/AuthInitializer';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { Login } from '../pages/Login';
import { LoginVerifyOtp } from '../pages/LoginVerifyOtp';
import { ForgotPassword } from '../pages/ForgotPassword';
import { Dashboard } from '../pages/Dashboard';
import { ResetPassword } from '../pages/ResetPassword';

export function AppRoutes() {
  return (
    <AuthInitializer>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/login/verify-otp" element={<LoginVerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </AuthInitializer>
  );
}
