import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";


export interface AccessTokenPayload {
  adminId: string;
  role: "admin";
}

const ACCESS_SECRET = env.ACCESS_SECRET;
const REFRESH_SECRET = env.REFRESH_SECRET;
const ACCESS_EXPIRES_IN = env.ACCESS_EXPIRES_IN;
const REFRESH_EXPIRES_IN = env.REFRESH_EXPIRES_IN;

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
    expiresIn: ACCESS_EXPIRES_IN as unknown as SignOptions['expiresIn'],
    algorithm: "HS256",
  };

  return jwt.sign(payload, ACCESS_SECRET, options);
};

/**
 * Generate Refresh Token (long-lived)
 */
export const generateRefreshToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: REFRESH_EXPIRES_IN as unknown as SignOptions['expiresIn'],
    algorithm: "HS256",
  };

  return jwt.sign(payload, REFRESH_SECRET, options);
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