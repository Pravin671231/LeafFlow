import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { Admin } from "../../src/models/Admin";
import { connectTestDb, disconnectTestDb, clearCollections, seedAdmin } from "../helpers/seedAdmin";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearCollections);

describe("POST /api/admin/auth/login", () => {
  it("I1: correct credentials → 200 with otpSessionId", async () => {
    await seedAdmin();
    const res = await request(app)
      .post("/api/admin/auth/login")
      .send({ loginEmail: "admin@leafflow.com", password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.otpSessionId");
    expect(res.body).toHaveProperty("data.expiresInSeconds", 300);
  });

  it("I2: wrong password → 401 INVALID_CREDENTIALS", async () => {
    await seedAdmin();
    const res = await request(app)
      .post("/api/admin/auth/login")
      .send({ loginEmail: "admin@leafflow.com", password: "WrongPass!" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_CREDENTIALS" });
  });

  it("I3: locked account → 403 ACCOUNT_LOCKED", async () => {
    await seedAdmin({ failedLoginAttempts: 5, lockUntil: new Date(Date.now() + 10 * 60 * 1000) });
    const res = await request(app)
      .post("/api/admin/auth/login")
      .send({ loginEmail: "admin@leafflow.com", password: "Password123!" });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, code: "ACCOUNT_LOCKED" });
  });

  it("I4: 5th failed attempt sets lockUntil in DB", async () => {
    await seedAdmin({ failedLoginAttempts: 4 });
    await request(app)
      .post("/api/admin/auth/login")
      .send({ loginEmail: "admin@leafflow.com", password: "WrongPass!" });

    const admin = await Admin.findOne({ loginEmail: "admin@leafflow.com" });
    expect(admin?.lockUntil).toBeDefined();
    expect(admin!.lockUntil!.getTime()).toBeGreaterThan(Date.now());
  });
});
