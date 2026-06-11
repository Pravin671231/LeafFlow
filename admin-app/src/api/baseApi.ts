import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '../app/store';
import { setCredentials, clearCredentials } from '../features/auth/authSlice';
import type { Admin } from '../features/auth/authTypes';
import { API_BASE_URL, AUTH_BASE_PATH } from './constants';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}${AUTH_BASE_PATH}`,
  credentials: 'include',
  prepareHeaders(headers, { getState }) {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401) return result;

  const refreshResult = await rawBaseQuery(
    { url: '/refresh', method: 'POST' },
    api,
    extraOptions,
  );

  if (refreshResult.data) {
    const raw = refreshResult.data as Record<string, unknown>;
    const data = (raw.data ?? raw) as Record<string, unknown>;
    const accessToken = (data.accessToken ?? '') as string;
    const admin = (api.getState() as RootState).auth.admin;
    if (admin) {
      api.dispatch(setCredentials({ admin, accessToken }));
    }
    result = await rawBaseQuery(args, api, extraOptions);
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
export type { Admin };
