import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';

describe('App', () => {
  it('redirects unauthenticated users to /login and renders the login form', async () => {
    render(<App />);
    // AuthInitializer runs a silent /refresh (returns 401 from default MSW handler),
    // then resolves and renders the route tree. Wait for the login form to appear.
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
