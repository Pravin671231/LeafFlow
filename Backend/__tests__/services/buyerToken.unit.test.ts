import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Types } from "mongoose";
import {
  signBuyerAccessToken,
  verifyBuyerAccessToken,
  createBuyerRefreshToken,
  validateBuyerRefreshToken,
  createRefreshToken,
} from "../../src/services/token";
import { RefreshToken } from "../../src/models/RefreshToken";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

const payload = { userId: "507f1f77bcf86cd799439011", role: "buyer" as const };

describe("signBuyerAccessToken", () => {
  it("U1: returns RS256 JWT", () => {
    const token = signBuyerAccessToken(payload);
    expect(typeof token).toBe("string");
    const [header] = token.split(".");
    const decoded = JSON.parse(Buffer.from(header, "base64url").toString());
    expect(decoded.alg).toBe("RS256");
  });
});

describe("verifyBuyerAccessToken", () => {
  it("U2: returns payload for valid token", () => {
    const token = signBuyerAccessToken(payload);
    const result = verifyBuyerAccessToken(token);
    expect(result.userId).toBe(payload.userId);
    expect(result.role).toBe("buyer");
  });

  it("U3: throws for tampered token", () => {
    const token = signBuyerAccessToken(payload);
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(() => verifyBuyerAccessToken(tampered)).toThrow();
  });

  it("U4: throws for junk string", () => {
    expect(() => verifyBuyerAccessToken("bad.token.here")).toThrow();
  });
});

describe("createBuyerRefreshToken", () => {
  it("U5: writes RefreshToken doc with role: buyer and correct userId", async () => {
    const userId = new Types.ObjectId();
    await createBuyerRefreshToken(userId);

    const doc = await RefreshToken.findOne({ role: "buyer", userId });
    expect(doc).not.toBeNull();
    expect(doc!.role).toBe("buyer");
    expect(doc!.userId?.toString()).toBe(userId.toString());

    await RefreshToken.deleteMany({});
  });
});

describe("validateBuyerRefreshToken", () => {
  it("U6: returns userId + tokenHash for valid token", async () => {
    const userId = new Types.ObjectId();
    const raw = await createBuyerRefreshToken(userId);

    const result = await validateBuyerRefreshToken(raw);
    expect(result.userId.toString()).toBe(userId.toString());
    expect(typeof result.tokenHash).toBe("string");

    await RefreshToken.deleteMany({});
  });

  it("U7: throws for revoked token", async () => {
    const userId = new Types.ObjectId();
    const raw = await createBuyerRefreshToken(userId);
    await RefreshToken.findOneAndUpdate({ role: "buyer", userId }, { revokedAt: new Date() });

    await expect(validateBuyerRefreshToken(raw)).rejects.toThrow();
    await RefreshToken.deleteMany({});
  });

  it("U8: throws for expired token", async () => {
    const userId = new Types.ObjectId();
    const raw = await createBuyerRefreshToken(userId);
    await RefreshToken.findOneAndUpdate(
      { role: "buyer", userId },
      { expiresAt: new Date(Date.now() - 1000) }
    );

    await expect(validateBuyerRefreshToken(raw)).rejects.toThrow();
    await RefreshToken.deleteMany({});
  });

  it("U9: throws for admin-role token (wrong role filter)", async () => {
    const adminId = new Types.ObjectId();
    const adminRaw = await createRefreshToken(adminId);

    await expect(validateBuyerRefreshToken(adminRaw)).rejects.toThrow();
    await RefreshToken.deleteMany({});
  });
});
