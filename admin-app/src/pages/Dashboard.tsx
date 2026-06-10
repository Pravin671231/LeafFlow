import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectAdmin } from '../features/auth/authSelectors';
import { useGetMeQuery } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';

export function Dashboard() {
  const reduxAdmin = useSelector(selectAdmin);
  const { data: me, isLoading } = useGetMeQuery();
  const { handleLogout, isLoggingOut } = useAuth();

  const admin = me ?? reduxAdmin;

  const initials = admin?.name
    ? admin.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : (admin?.loginEmail?.[0]?.toUpperCase() ?? '?');

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <main className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : admin ? (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Profile card */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-14 grid place-items-center font-bold text-xl">
                      {initials}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-lg">{admin.name || 'Admin'}</p>
                    <span className="badge badge-primary badge-outline capitalize text-xs">
                      {admin.role}
                    </span>
                  </div>
                </div>

                <h2 className="card-title text-base mb-2">Profile</h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-base-content/50 uppercase tracking-wide">Login Email</p>
                    <p className="font-medium">{admin.loginEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/50 uppercase tracking-wide">OTP Delivery Email</p>
                    <p className="font-medium">{admin.otpDeliveryEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/50 uppercase tracking-wide">Last Login</p>
                    <p className="font-medium">
                      {admin.lastLoginAt
                        ? new Date(admin.lastLoginAt).toLocaleString()
                        : 'Never'}
                    </p>
                  </div>
                </div>

                <div className="card-actions justify-end mt-4">
                  <Link to="/settings/reset-password" className="btn btn-outline btn-sm">
                    Change Password
                  </Link>
                </div>
              </div>
            </div>

            {/* Status card */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title text-base">Account Status</h2>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-base-content/60">Status:</span>
                    <div
                      className={`badge ${admin.isActive ? 'badge-success' : 'badge-error'}`}
                    >
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
                <div className="card-actions justify-end mt-6">
                  <Button
                    variant="error"
                    className="btn-outline btn-sm"
                    isLoading={isLoggingOut}
                    onClick={handleLogout}
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
