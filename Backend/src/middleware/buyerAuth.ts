import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../services/token.service";
import { AppError } from "../utils/AppError";

export interface BuyerPayload {
  userId: string;
  role: "buyer";
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: BuyerPayload;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export async function buyerAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "No token provided"));
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    if (payload.role === "admin") {
      return next(new AppError(403, "FORBIDDEN", "Admin tokens are not accepted on buyer routes"));
    }
    if (!payload.id) {
      return next(new AppError(401, "INVALID_TOKEN", "Token is invalid"));
    }

    req.user = { userId: payload.id, role: "buyer" };
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError && err.message === "invalid signature") {
      return next(new AppError(401, "INVALID_TOKEN", "Token signature is invalid"));
    }
    return next(new AppError(401, "TOKEN_EXPIRED", "Token is invalid or expired"));
  }
}
