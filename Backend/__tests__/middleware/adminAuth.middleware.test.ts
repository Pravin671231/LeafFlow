import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import { adminAuth } from "../../src/middleware/adminAuth";
import { signAccessToken } from "../../src/services/token";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get("/protected", adminAuth, (req, res) => {
    res.json({ adminId: req.admin?.adminId });
  });
  return app;
}

const testApp = buildTestApp();
const validPayload = { adminId: "507f1f77bcf86cd799439011", role: "admin" as const };

describe("adminAuth middleware", () => {
  it("M1: valid Bearer token → req.admin populated, route returns 200", async () => {
    const token = signAccessToken(validPayload);
    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.adminId).toBe(validPayload.adminId);
  });

  it("M2: no Authorization header → 401 UNAUTHORIZED", async () => {
    const res = await request(testApp).get("/protected");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  it("M3: expired/invalid token string → 401 TOKEN_EXPIRED", async () => {
    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", "Bearer expired.jwt.token");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "TOKEN_EXPIRED" });
  });

  it("M4: tampered token → 401 INVALID_TOKEN", async () => {
    const token = signAccessToken(validPayload);
    const tampered = token.slice(0, -5) + "XXXXX";
    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${tampered}`);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_TOKEN" });
  });
});
