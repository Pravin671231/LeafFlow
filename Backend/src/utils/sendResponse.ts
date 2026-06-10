import { Response } from "express";

interface ResponseOptions<T = any> {
  res: Response;
  statusCode?: number;
  success?: boolean;
  message?: string;
  data?: T;
}

export const sendResponse = <T = any>({
  res,
  statusCode = 200,
  success = true,
  message,
  data,
}: ResponseOptions<T>): void => {
  res.status(statusCode).json({
    success,
    message,
    ...(data !== undefined ? { data } : {}),
  });
};
