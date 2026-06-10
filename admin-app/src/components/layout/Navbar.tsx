import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function Navbar() {
  const { admin, handleLogout, isLoggingOut } = useAuth();

  const initials = admin?.name
    ? admin.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : (admin?.loginEmail?.[0]?.toUpperCase() ?? '?');

  return (
    <div className="navbar bg-base-100 shadow-sm px-4">
      <div className="flex-1">
        <span className="text-xl font-bold text-primary">LeafFlow</span>
        <span className="ml-2 text-base-content/60 text-sm font-medium">Admin</span>
      </div>
      <div className="flex-none">
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle avatar placeholder"
          >
            <div className="bg-primary text-primary-content rounded-full w-10 grid place-items-center font-bold text-sm">
              {initials}
            </div>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow"
          >
            <li>
              <Link to="/settings/reset-password">Change Password</Link>
            </li>
            <li>
              <button onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
