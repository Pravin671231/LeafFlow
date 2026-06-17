import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

const ACCESS_SECRET = env.ACCESS_SECRET;
const REFRESH_SECRET = env.REFRESH_SECRET;
const ACCESS_EXPIRES_IN = env.ACCESS_EXPIRES_IN as SignOptions["expiresIn"];
const REFRESH_EXPIRES_IN = env.REFRESH_EXPIRES_IN as SignOptions["expiresIn"];

// Types for payload
export interface JwtPayload {
  id: string;
  role?: string;
}

/**
 * Generate Access Token (short-lived)
 */
export const generateAccessToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: ACCESS_EXPIRES_IN,
    algorithm: "HS256",
  };

  return jwt.sign(payload, ACCESS_SECRET, options);
};

/**
 * Generate Refresh Token (long-lived)
 */
export const generateRefreshToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: REFRESH_EXPIRES_IN,
    algorithm: "HS256",
  };

  return jwt.sign({ id: payload.id }, REFRESH_SECRET, options);
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
};

/**
 * Adapter for callers that use { adminId, role } shape — maps adminId → id internally
 */
export const signAccessToken = (payload: { adminId: string; role: string }): string => {
  return generateAccessToken({ id: payload.adminId, role: payload.role });
};
