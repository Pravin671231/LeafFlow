export interface ApiError {
  success: false;
  code: string;
  message: string;
  details?: Record<string, string>;
}

export interface ApiResponse<T = undefined> {
  success: true;
  message?: string;
  data?: T;
}
