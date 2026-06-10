import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('http://localhost:3000/api/admin/auth/refresh', () =>
    HttpResponse.json(
      { success: false, code: 'UNAUTHORIZED', message: 'No session' },
      { status: 401 },
    ),
  ),
  http.get('http://localhost:3000/api/admin/auth/me', () =>
    HttpResponse.json(
      { success: false, code: 'UNAUTHORIZED', message: 'Not authenticated' },
      { status: 401 },
    ),
  ),
];
