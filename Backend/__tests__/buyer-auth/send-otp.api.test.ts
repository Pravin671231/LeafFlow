import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";

const sendMailMock = vi.fn().mockResolvedValue({ messageId: "test-id" });
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
  },
}));

import app from "../../src/app";
import { User } from "../../src/models/User";
import { OtpSession } from "../../src/models/OtpSession";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";
import { clearBuyerCollections, seedBuyer } from "../helpers/seedBuyer";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(async () => {
  await clearBuyerCollections();
  sendMailMock.mockClear();
});

describe("POST /api/buyer/auth/email/send-otp", () => {
  it("I1: valid email → 200 with otpSessionId and expiresInSeconds", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/email/send-otp")
      .send({ email: "buyer@test.com" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.otpSessionId");
    expect(res.body).toHaveProperty("data.expiresInSeconds", 300);
  });

  it("I2: new email → User created in DB with isVerified: false", async () => {
    await request(app)
      .post("/api/buyer/auth/email/send-otp")
      .send({ email: "new@test.com" });

    const user = await User.findOne({ email: "new@test.com" });
    expect(user).not.toBeNull();
    expect(user!.isVerified).toBe(false);
  });

  it("I3: existing user email → only one User doc after second call", async () => {
    await seedBuyer({ email: "existing@test.com" });

    await request(app)
      .post("/api/buyer/auth/email/send-otp")
      .send({ email: "existing@test.com" });

    const count = await User.countDocuments({ email: "existing@test.com" });
    expect(count).toBe(1);
  });

  it("I4: missing email field → 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/email/send-otp")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
  });

  it("I5: invalid email format → 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/email/send-otp")
      .send({ email: "notanemail" });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
  });

  it("I6: email delivery fails → still 200 (non-fatal)", async () => {
    sendMailMock.mockRejectedValueOnce(new Error("SMTP error"));

    const res = await request(app)
      .post("/api/buyer/auth/email/send-otp")
      .send({ email: "buyer@test.com" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.otpSessionId");
  });

  it("OTP is not stored as plain text in DB", async () => {
    await request(app)
      .post("/api/buyer/auth/email/send-otp")
      .send({ email: "buyer@test.com" });

    const otp = sendMailMock.mock.calls[0]?.[0]?.text?.match(/\d{6}/)?.[0];
    const session = await OtpSession.findOne({ purpose: "buyer_login" });

    expect(session).not.toBeNull();
    expect(session!.otpHash).not.toBe(otp);
  });
});
