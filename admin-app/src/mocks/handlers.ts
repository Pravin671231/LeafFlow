import { http, HttpResponse } from 'msw';
import { API_BASE_URL, AUTH_BASE_PATH } from '../api/constants';
import { AUTH_ENDPOINTS } from '../api/endpoints';

const authUrl = (path: string) => `${API_BASE_URL}${AUTH_BASE_PATH}${path}`;

export const handlers = [
  http.post(authUrl(AUTH_ENDPOINTS.REFRESH), () =>
    HttpResponse.json(
      { success: false, code: 'UNAUTHORIZED', message: 'No session' },
      { status: 401 },
    ),
  ),
  http.get(authUrl(AUTH_ENDPOINTS.ME), () =>
    HttpResponse.json(
      { success: false, code: 'UNAUTHORIZED', message: 'Not authenticated' },
      { status: 401 },
    ),
  ),
];
