import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }) })),
  },
}));

import app from "../../src/app";
import { RefreshToken } from "../../src/models/RefreshToken";
import { signBuyerAccessToken, signAccessToken } from "../../src/services/token";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";
import { clearBuyerCollections, seedBuyer } from "../helpers/seedBuyer";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearBuyerCollections);

async function seedBuyerRefreshToken(userId: string, overrides: Partial<{ revokedAt: Date }> = {}) {
  const raw = "buyer-raw-refresh-token-32chars!!";
  await RefreshToken.create({
    selector: raw.slice(0, 16),
    tokenHash: await bcrypt.hash(raw, 10),
    userId,
    role: "buyer",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  });
  return raw;
}

describe("POST /api/buyer/auth/refresh", () => {
  it("I24: valid refreshToken cookie → 200, new accessToken in body", async () => {
    const user = await seedBuyer();
    const raw = await seedBuyerRefreshToken(user._id.toString());

    const res = await request(app)
      .post("/api/buyer/auth/refresh")
      .set("Cookie", `refreshToken=${raw}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.accessToken");
  });

  it("I25: no refreshToken cookie → 401", async () => {
    const res = await request(app).post("/api/buyer/auth/refresh");

    expect(res.status).toBe(401);
  });

  it("I26: revoked refresh token → 401 INVALID_REFRESH_TOKEN", async () => {
    const user = await seedBuyer();
    const raw = await seedBuyerRefreshToken(user._id.toString(), { revokedAt: new Date() });

    const res = await request(app)
      .post("/api/buyer/auth/refresh")
      .set("Cookie", `refreshToken=${raw}`);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_REFRESH_TOKEN" });
  });
});

describe("POST /api/buyer/auth/logout", () => {
  it("I27: valid session → 200, refreshToken cookie cleared, token revoked in DB", async () => {
    const user = await seedBuyer();
    const token = signBuyerAccessToken({ userId: user._id.toString(), role: "buyer" });
    const raw = await seedBuyerRefreshToken(user._id.toString());

    const res = await request(app)
      .post("/api/buyer/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .set("Cookie", `refreshToken=${raw}`);

    expect(res.status).toBe(200);

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith("refreshToken=;"))).toBe(true);

    const rt = await RefreshToken.findOne({ userId: user._id });
    expect(rt?.revokedAt).toBeDefined();
  });

  it("I28: no Authorization header → 401 UNAUTHORIZED", async () => {
    const res = await request(app).post("/api/buyer/auth/logout");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  it("I29: already-revoked refreshToken cookie → 200 (graceful no-op)", async () => {
    const user = await seedBuyer();
    const token = signBuyerAccessToken({ userId: user._id.toString(), role: "buyer" });
    const raw = await seedBuyerRefreshToken(user._id.toString(), { revokedAt: new Date() });

    const res = await request(app)
      .post("/api/buyer/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .set("Cookie", `refreshToken=${raw}`);

    expect(res.status).toBe(200);
  });
});

describe("GET /api/buyer/auth/me", () => {
  it("I30: valid buyer token → 200, user profile returned", async () => {
    const user = await seedBuyer();
    const token = signBuyerAccessToken({ userId: user._id.toString(), role: "buyer" });

    const res = await request(app)
      .get("/api/buyer/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      email: "buyer@test.com",
      name: "Test Buyer",
      role: "buyer",
    });
  });

  it("I31: no Authorization header → 401 UNAUTHORIZED", async () => {
    const res = await request(app).get("/api/buyer/auth/me");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  it("I32: admin token rejected by buyerAuth guard → 401", async () => {
    const adminToken = signAccessToken({ adminId: "507f1f77bcf86cd799439011", role: "admin" });

    const res = await request(app)
      .get("/api/buyer/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(401);
  });
});
