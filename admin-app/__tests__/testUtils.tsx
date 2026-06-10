import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../src/store/authSlice';
import { authApi } from '../src/store/authApi';
import type { AuthState } from '../src/store/authSlice';

interface PreloadedState {
  auth?: Partial<AuthState>;
}

export function createTestStore(preloadedState: PreloadedState = {}) {
  return configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(authApi.middleware),
    preloadedState: {
      auth: {
        admin: null,
        isAuthenticated: false,
        accessToken: null,
        ...preloadedState.auth,
      },
    },
  });
}

interface RenderOptions {
  initialEntries?: (string | { pathname: string; state?: unknown })[];
  preloadedState?: PreloadedState;
}

export function renderWithProviders(
  ui: React.ReactElement,
  { initialEntries = ['/'], preloadedState = {} }: RenderOptions = {},
) {
  const store = createTestStore(preloadedState);
  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </Provider>,
  );
  return { ...result, store };
}
