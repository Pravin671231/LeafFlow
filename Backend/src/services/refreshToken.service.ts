import bcrypt from "bcryptjs";
import { RefreshToken } from "../models/RefreshToken";
import { AppError } from "../utils/AppError";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function storeRefreshToken(
  raw: string,
  id: string,
  role: "admin" | "buyer"
): Promise<void> {
  const selector = raw.slice(0, 16);
  const tokenHash = await bcrypt.hash(raw, 10);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  const ownerField = role === "admin" ? { adminId: id } : { userId: id };
  await RefreshToken.create({ selector, tokenHash, ...ownerField, role, expiresAt });
}

export async function validateRefreshToken(
  raw: string
): Promise<{ id: string; role: "admin" | "buyer"; tokenHash: string }> {
  const selector = raw.slice(0, 16);
  const record = await RefreshToken.findOne({ selector });
  if (!record) throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token not found");

  const valid = await bcrypt.compare(raw, record.tokenHash);
  if (!valid) throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid");

  if (record.revokedAt) throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token has been revoked");

  const id = record.role === "admin" ? record.adminId!.toString() : record.userId!.toString();
  return { id, role: record.role, tokenHash: record.tokenHash };
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await RefreshToken.findOneAndUpdate({ tokenHash }, { revokedAt: new Date() });
}
