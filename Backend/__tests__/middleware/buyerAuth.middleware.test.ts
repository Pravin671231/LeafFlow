import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { buyerAuth, optionalBuyerAuth } from "../../src/middleware/buyerAuth";
import { signBuyerAccessToken, signAccessToken } from "../../src/services/token";

function buildTestApp() {
  const app = express();
  app.use(express.json());

  app.get("/protected", buyerAuth, (req, res) => {
    res.json({ userId: req.buyer?.userId });
  });

  app.get("/optional", optionalBuyerAuth, (req, res) => {
    res.json({ userId: req.buyer?.userId ?? null });
  });

  return app;
}

const testApp = buildTestApp();
const validPayload = { userId: "507f1f77bcf86cd799439011", role: "buyer" as const };

// ─── buyerAuth (hard guard) ───────────────────────────────────────────────────

describe("buyerAuth middleware", () => {
  it("M1: valid buyer Bearer token → req.buyer populated, 200", async () => {
    const token = signBuyerAccessToken(validPayload);

    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(validPayload.userId);
  });

  it("M2: no Authorization header → 401 UNAUTHORIZED", async () => {
    const res = await request(testApp).get("/protected");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  it("M3: malformed token string → 401 TOKEN_EXPIRED", async () => {
    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", "Bearer bad.token.here");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "TOKEN_EXPIRED" });
  });

  it("M4: tampered token → 401 INVALID_TOKEN", async () => {
    const token = signBuyerAccessToken(validPayload);
    const tampered = token.slice(0, -5) + "XXXXX";

    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${tampered}`);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_TOKEN" });
  });

  it("M5: admin token rejected by buyer guard → 401", async () => {
    const adminToken = signAccessToken({ adminId: "507f1f77bcf86cd799439011", role: "admin" });

    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(401);
  });
});

// ─── optionalBuyerAuth (soft guard) ──────────────────────────────────────────

describe("optionalBuyerAuth middleware", () => {
  it("M6: valid buyer token → req.buyer populated", async () => {
    const token = signBuyerAccessToken(validPayload);

    const res = await request(testApp)
      .get("/optional")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(validPayload.userId);
  });

  it("M7: no Authorization header → req.buyer undefined, still 200", async () => {
    const res = await request(testApp).get("/optional");

    expect(res.status).toBe(200);
    expect(res.body.userId).toBeNull();
  });

  it("M8: invalid token → req.buyer undefined, still 200 (no 401)", async () => {
    const res = await request(testApp)
      .get("/optional")
      .set("Authorization", "Bearer bad.token.here");

    expect(res.status).toBe(200);
    expect(res.body.userId).toBeNull();
  });
});
