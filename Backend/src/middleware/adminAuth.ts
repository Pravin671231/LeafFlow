import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../services/token.service";
import { AppError } from "../utils/AppError";

export interface AdminPayload {
  adminId: string;
  role: "admin";
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export async function adminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "No token provided"));
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyAccessToken(token);
    if (payload.role !== "admin" || !payload.id) {
      return next(new AppError(401, "TOKEN_EXPIRED", "Token is invalid or expired"));
    }

    req.admin = { adminId: payload.id, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError && err.message === "invalid signature") {
      return next(new AppError(401, "INVALID_TOKEN", "Token signature is invalid"));
    }
    return next(new AppError(401, "TOKEN_EXPIRED", "Token is invalid or expired"));
  }
}
