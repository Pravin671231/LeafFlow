import { Request, Response, NextFunction } from "express";
import { AppError } from "./AppError";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  try {
    if (!(err instanceof AppError)) throw err;
    res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Internal server error" });
  }
}
