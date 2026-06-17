import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { User } from "../../src/models/User";
import { OtpSession } from "../../src/models/OtpSession";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";

vi.mock("../../src/services/integrations/email.service", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

async function clearCollections() {
  await Promise.all([User.deleteMany({}), OtpSession.deleteMany({})]);
}

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearCollections);

describe("POST /api/buyer/auth/email/send-otp", () => {
  it("B1: new email → 200, otpSessionId returned, User created with isVerified: false", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/email/send-otp")
      .send({ email: "newbuyer@test.com" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.otpSessionId");
    expect(res.body).toHaveProperty("data.expiresInSeconds", 300);

    const user = await User.findOne({ email: "newbuyer@test.com" });
    expect(user).not.toBeNull();
    expect(user!.isVerified).toBe(false);
  });

  it("B2: existing buyer email → 200, new otpSessionId, no duplicate User document", async () => {
    await User.create({ email: "existing@test.com", name: "Existing Buyer", isVerified: true });

    const res = await request(app)
      .post("/api/buyer/auth/email/send-otp")
      .send({ email: "existing@test.com" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.otpSessionId");

    const count = await User.countDocuments({ email: "existing@test.com" });
    expect(count).toBe(1);
  });

  it("B3: invalid email format → 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/email/send-otp")
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
  });

  it("B4: missing email → 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/email/send-otp")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
  });
});
