import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { setCredentials, clearCredentials } from '../features/auth/authSlice';
import type { AuthState } from '../features/auth/authTypes';
type StoreAuthSlice = { auth: AuthState };
import { API_BASE_URL, AUTH_BASE_PATH } from './constants';
import type { ApiResponse } from '../types/api.types';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}${AUTH_BASE_PATH}`,
  credentials: 'include',
  prepareHeaders(headers, { getState }) {
    const token = (getState() as StoreAuthSlice).auth.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Strips the ApiResponse<T> envelope so every endpoint receives the unwrapped payload.
// Falls back to { message } for responses that carry no data field (e.g. message-only responses).
const baseQueryWithUnwrap: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.data !== undefined) {
    const { data, message } = result.data as ApiResponse<unknown>;
    const unwrapped = data !== undefined ? data : message !== undefined ? { message } : undefined;
    return { ...result, data: unwrapped };
  }
  return result;
};

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQueryWithUnwrap(args, api, extraOptions);

  if (result.error?.status !== 401) return result;

  const refreshResult = await baseQueryWithUnwrap(
    { url: '/refresh', method: 'POST' },
    api,
    extraOptions,
  );

  if (refreshResult.data) {
    const { accessToken } = refreshResult.data as { accessToken: string };
    const admin = (api.getState() as StoreAuthSlice).auth.admin;
    if (admin) {
      api.dispatch(setCredentials({ admin, accessToken }));
    }
    result = await baseQueryWithUnwrap(args, api, extraOptions);
  } else {
    api.dispatch(clearCredentials());
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
});

// Re-export Admin type for use in AuthInitializer endpoint typings
