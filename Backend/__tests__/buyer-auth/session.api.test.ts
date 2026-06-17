import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../src/app";
import { User } from "../../src/models/User";
import { RefreshToken } from "../../src/models/RefreshToken";
import { OtpSession } from "../../src/models/OtpSession";
import { generateAccessToken } from "../../src/services/token.service";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";

async function clearCollections() {
  await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({}), OtpSession.deleteMany({})]);
}

async function seedBuyer() {
  return User.create({ email: "buyer@test.com", isVerified: true });
}

async function seedBuyerRefreshToken(userId: string, raw: string, overrides: Record<string, unknown> = {}) {
  return RefreshToken.create({
    selector: raw.slice(0, 16),
    tokenHash: await bcrypt.hash(raw, 10),
    userId,
    role: "buyer",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  });
}

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearCollections);

describe("GET /api/buyer/auth/me", () => {
  it("B10: valid buyer JWT → 200 with buyer profile", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });

    const res = await request(app)
      .get("/api/buyer/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.email", "buyer@test.com");
  });

  it("B11: admin JWT on buyer route → 403 FORBIDDEN", async () => {
    const token = generateAccessToken({ id: "some-admin-id", role: "admin" });

    const res = await request(app)
      .get("/api/buyer/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, code: "FORBIDDEN" });
  });

  it("B12: no token → 401 UNAUTHORIZED", async () => {
    const res = await request(app).get("/api/buyer/auth/me");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });
});

describe("POST /api/buyer/auth/refresh", () => {
  it("B13: valid refresh cookie → 200 with new accessToken", async () => {
    const user = await seedBuyer();
    const rawToken = "valid-buyer-raw-token";
    await seedBuyerRefreshToken(user._id.toString(), rawToken);

    const res = await request(app)
      .post("/api/buyer/auth/refresh")
      .set("Cookie", `refreshToken=${rawToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.accessToken");
  });

  it("B14: revoked refresh token → 401 INVALID_REFRESH_TOKEN", async () => {
    const user = await seedBuyer();
    const rawToken = "revoked-buyer-token";
    await seedBuyerRefreshToken(user._id.toString(), rawToken, { revokedAt: new Date() });

    const res = await request(app)
      .post("/api/buyer/auth/refresh")
      .set("Cookie", `refreshToken=${rawToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_REFRESH_TOKEN" });
  });

  it("B15: no cookie → 401", async () => {
    const res = await request(app).post("/api/buyer/auth/refresh");

    expect(res.status).toBe(401);
  });
});

describe("POST /api/buyer/auth/logout", () => {
  it("B16: valid session → 200, refresh token revoked in DB", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });
    const rawToken = "buyer-logout-token";
    await seedBuyerRefreshToken(user._id.toString(), rawToken);

    const res = await request(app)
      .post("/api/buyer/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .set("Cookie", `refreshToken=${rawToken}`);

    expect(res.status).toBe(200);
    const rt = await RefreshToken.findOne({ userId: user._id });
    expect(rt?.revokedAt).toBeDefined();
  });

  it("B17: logout without refresh cookie → 200 (graceful)", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });

    const res = await request(app)
      .post("/api/buyer/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

describe("Cross-role JWT rejection", () => {
  it("B18: buyer JWT on GET /api/admin/auth/me → 401", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });

    const res = await request(app)
      .get("/api/admin/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});
