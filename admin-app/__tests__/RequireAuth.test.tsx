import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders } from './testUtils';
import { ProtectedRoute } from '../src/components/common/ProtectedRoute';

function LocationDisplay() {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
}

describe('ProtectedRoute', () => {
  // U4
  it('renders child route when authenticated', () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { initialEntries: ['/dashboard'], preloadedState: { auth: { isAuthenticated: true } } },
    );

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  // U5
  it('redirects to /login when not authenticated', () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard Content</div>} />
        </Route>
        <Route path="/login" element={<LocationDisplay />} />
      </Routes>,
      { initialEntries: ['/dashboard'], preloadedState: { auth: { isAuthenticated: false } } },
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/login');
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });
});
