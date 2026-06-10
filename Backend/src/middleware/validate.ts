import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/AppError";

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = Object.fromEntries(
        result.error.issues.map((issue) => [issue.path.join(".") || "_root", issue.message])
      );
      throw new AppError(400, "VALIDATION_ERROR", "Validation failed", details);
    }
    req.body = result.data;
    next();
  };
}
