import { Response } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

interface ResponseOptions<T = unknown> {
  res: Response;
  statusCode?: number;
  success?: boolean;
  message?: string;
  data?: T;
  pagination?: PaginationMeta;
}

export const sendResponse = <T = unknown>({
  res,
  statusCode = 200,
  success = true,
  message,
  data,
  pagination,
}: ResponseOptions<T>): void => {
  res.status(statusCode).json({
    success,
    message,
    ...(data !== undefined ? { data } : {}),
    ...(pagination !== undefined ? { pagination } : {}),
  });
};
