import jwt, { type SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Types } from "mongoose";
import { RefreshToken } from "../models/RefreshToken";
import { env } from "../config/env";
import { REFRESH_TOKEN_TTL_MS, BCRYPT_ROUNDS_OTP } from "../config/constants";

export interface AccessTokenPayload {
  adminId: string;
  role: "admin";
}

const JWT_PRIVATE_KEY = env.JWT_PRIVATE_KEY.replace(/\\n/g, "\n");
const JWT_PUBLIC_KEY = env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_PRIVATE_KEY, { algorithm: "RS256", expiresIn: JWT_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ["RS256"] });
  return decoded as AccessTokenPayload;
}

export async function createRefreshToken(adminId: Types.ObjectId): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  const selector = raw.slice(0, 16);
  const tokenHash = await bcrypt.hash(raw, BCRYPT_ROUNDS_OTP);
  await RefreshToken.create({
    selector,
    tokenHash,
    adminId,
    role: "admin",
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  return raw;
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await RefreshToken.findOneAndUpdate({ tokenHash }, { revokedAt: new Date() });
}

export async function validateRefreshToken(
  raw: string
): Promise<{ adminId: Types.ObjectId; tokenHash: string }> {
  const selector = raw.slice(0, 16);
  const record = await RefreshToken.findOne({
    selector,
    role: "admin",
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
  if (!record) throw new Error("Invalid refresh token");
  const match = await bcrypt.compare(raw, record.tokenHash);
  if (!match) throw new Error("Invalid refresh token");
  if (!record.adminId) throw new Error("Token has no adminId");
  return { adminId: record.adminId as Types.ObjectId, tokenHash: record.tokenHash };
}
