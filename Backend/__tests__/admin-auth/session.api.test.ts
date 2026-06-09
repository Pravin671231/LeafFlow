import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../src/app";
import { RefreshToken } from "../../src/models/RefreshToken";
import { signAccessToken } from "../../src/services/token";
import { connectTestDb, disconnectTestDb, clearCollections, seedAdmin } from "../helpers/seedAdmin";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearCollections);

describe("GET /api/admin/auth/me", () => {
  it("I9: valid JWT → 200 with admin profile", async () => {
    const admin = await seedAdmin();
    const token = signAccessToken({ adminId: admin._id.toString(), role: "admin" });

    const res = await request(app)
      .get("/api/admin/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.loginEmail", "admin@leafflow.com");
  });

  it("I10: expired/invalid JWT → 401", async () => {
    const res = await request(app)
      .get("/api/admin/auth/me")
      .set("Authorization", "Bearer expired.token.value");

    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/auth/refresh", () => {
  it("I11: valid refresh cookie → 200 with new accessToken", async () => {
    const admin = await seedAdmin();
    const rawToken = "valid-raw-token";
    await RefreshToken.create({
      selector: rawToken.slice(0, 16),
      tokenHash: await bcrypt.hash(rawToken, 10),
      adminId: admin._id,
      role: "admin",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .post("/api/admin/auth/refresh")
      .set("Cookie", `refreshToken=${rawToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.accessToken");
  });

  it("I12: revoked refresh token → 401 INVALID_REFRESH_TOKEN", async () => {
    const admin = await seedAdmin();
    const rawToken = "revoked-token";
    await RefreshToken.create({
      selector: rawToken.slice(0, 16),
      tokenHash: await bcrypt.hash(rawToken, 10),
      adminId: admin._id,
      role: "admin",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: new Date(),
    });

    const res = await request(app)
      .post("/api/admin/auth/refresh")
      .set("Cookie", `refreshToken=${rawToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_REFRESH_TOKEN" });
  });
});

describe("POST /api/admin/auth/logout", () => {
  it("I13: valid session → 200, refresh token revoked in DB", async () => {
    const admin = await seedAdmin();
    const token = signAccessToken({ adminId: admin._id.toString(), role: "admin" });
    const rawToken = "logout-test-token";
    await RefreshToken.create({
      selector: rawToken.slice(0, 16),
      tokenHash: await bcrypt.hash(rawToken, 10),
      adminId: admin._id,
      role: "admin",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .post("/api/admin/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .set("Cookie", `refreshToken=${rawToken}`);

    expect(res.status).toBe(200);
    const rt = await RefreshToken.findOne({ adminId: admin._id });
    expect(rt?.revokedAt).toBeDefined();
  });
});
