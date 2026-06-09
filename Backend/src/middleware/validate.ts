import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/AppError";

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? "Invalid request body";
      throw new AppError(400, "VALIDATION_ERROR", msg);
    }
    req.body = result.data;
    next();
  };
}
