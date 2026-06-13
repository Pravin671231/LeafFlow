import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyBuyerAccessToken } from "../services/token";

export interface BuyerPayload {
  userId: string;
  role: "buyer";
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      buyer?: BuyerPayload;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export function buyerAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "No token provided" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyBuyerAccessToken(token);
    if (payload.role !== "buyer") {
      res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Invalid token role" });
      return;
    }
    req.buyer = { userId: payload.userId, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError && err.message === "invalid signature") {
      res.status(401).json({ success: false, code: "INVALID_TOKEN", message: "Token signature is invalid" });
      return;
    }
    res.status(401).json({ success: false, code: "TOKEN_EXPIRED", message: "Token is invalid or expired" });
  }
}

export function optionalBuyerAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyBuyerAccessToken(token);
    if (payload.role === "buyer") {
      req.buyer = { userId: payload.userId, role: payload.role };
    }
  } catch {
    // invalid or expired token — continue as anonymous
  }
  next();
}
