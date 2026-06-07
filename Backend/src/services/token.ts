import jwt, { type SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Types } from "mongoose";
import { RefreshToken } from "../models/RefreshToken";

export interface AccessTokenPayload {
  adminId: string;
  role: "admin";
}

const JWT_PRIVATE_KEY = (process.env.JWT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const JWT_PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY || "").replace(/\\n/g, "\n");
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "15m") as SignOptions["expiresIn"];
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_PRIVATE_KEY, { algorithm: "RS256", expiresIn: JWT_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ["RS256"] });
  return decoded as AccessTokenPayload;
}

export async function createRefreshToken(adminId: Types.ObjectId): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  const tokenHash = await bcrypt.hash(raw, 10);
  await RefreshToken.create({
    tokenHash,
    adminId,
    role: "admin",
    expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
  });
  return raw;
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await RefreshToken.findOneAndUpdate({ tokenHash }, { revokedAt: new Date() });
}

export async function validateRefreshToken(
  raw: string
): Promise<{ adminId: Types.ObjectId; tokenHash: string }> {
  const records = await RefreshToken.find({
    role: "admin",
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
  for (const record of records) {
    const match = await bcrypt.compare(raw, record.tokenHash);
    if (match) {
      if (!record.adminId) throw new Error("Token has no adminId");
      return { adminId: record.adminId as Types.ObjectId, tokenHash: record.tokenHash };
    }
  }
  throw new Error("Invalid refresh token");
}
