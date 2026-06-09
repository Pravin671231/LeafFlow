import { Request, Response, NextFunction } from "express";
import { AppError } from "./AppError";
import { logger } from "./logger";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn({ code: err.code, status: err.statusCode, path: req.path }, err.message);
    res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
  } else {
    logger.error({ err, path: req.path }, "Unhandled error");
    res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Internal server error" });
  }
}
