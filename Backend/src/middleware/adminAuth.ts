import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../services/token";

export interface AdminPayload {
  adminId: string;
  role: "admin";
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "No token provided" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.admin = { adminId: payload.adminId, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError && err.message === "invalid signature") {
      res.status(401).json({ success: false, code: "INVALID_TOKEN", message: "Token signature is invalid" });
      return;
    }
    res.status(401).json({ success: false, code: "TOKEN_EXPIRED", message: "Token is invalid or expired" });
  }
}
