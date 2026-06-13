import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }) })),
  },
}));

import app from "../../src/app";
import { User } from "../../src/models/User";
import { OtpSession } from "../../src/models/OtpSession";
import { hashOtp } from "../../src/services/otp";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";
import { clearBuyerCollections, seedBuyer } from "../helpers/seedBuyer";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearBuyerCollections);

async function seedOtpSession(overrides: Partial<{
  purpose: string;
  expiresAt: Date;
  attemptCount: number;
  otp: string;
  email: string;
}> = {}) {
  const email = overrides.email ?? "buyer@test.com";
  const otp = overrides.otp ?? "123456";
  await seedBuyer({ email, isVerified: false });
  const session = await OtpSession.create({
    purpose: overrides.purpose ?? "buyer_login",
    identifier: email,
    otpHash: await hashOtp(otp),
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000),
    attemptCount: overrides.attemptCount ?? 0,
  });
  return { session, otp, email };
}

describe("POST /api/buyer/auth/email/verify-otp", () => {
  it("I7: correct OTP → 200, accessToken in body + refreshToken httpOnly cookie", async () => {
    const { session, otp } = await seedOtpSession();

    const res = await request(app)
      .post("/api/buyer/auth/email/verify-otp")
      .send({ otpSessionId: session._id.toString(), otp });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.accessToken");

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);
  });

  it("I8: wrong OTP → 401 INVALID_OTP, attemptCount incremented in DB", async () => {
    const { session } = await seedOtpSession();

    const res = await request(app)
      .post("/api/buyer/auth/email/verify-otp")
      .send({ otpSessionId: session._id.toString(), otp: "000000" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_OTP" });

    const updated = await OtpSession.findById(session._id);
    expect(updated!.attemptCount).toBe(1);
  });

  it("I9: expired session → 401 OTP_EXPIRED", async () => {
    const { session, otp } = await seedOtpSession({ expiresAt: new Date(Date.now() - 1000) });

    const res = await request(app)
      .post("/api/buyer/auth/email/verify-otp")
      .send({ otpSessionId: session._id.toString(), otp });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "OTP_EXPIRED" });
  });

  it("I10: attemptCount >= 5 → 429 OTP_MAX_ATTEMPTS", async () => {
    const { session, otp } = await seedOtpSession({ attemptCount: 5 });

    const res = await request(app)
      .post("/api/buyer/auth/email/verify-otp")
      .send({ otpSessionId: session._id.toString(), otp });

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ success: false, code: "OTP_MAX_ATTEMPTS" });
  });

  it("I11: non-existent otpSessionId → 401 INVALID_OTP", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/email/verify-otp")
      .send({ otpSessionId: "000000000000000000000000", otp: "123456" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_OTP" });
  });

  it("I12: missing otpSessionId field → 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/email/verify-otp")
      .send({ otp: "123456" });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
  });

  it("I13: OTP length ≠ 6 → 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/email/verify-otp")
      .send({ otpSessionId: "000000000000000000000000", otp: "123" });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
  });

  it("I14: correct OTP → User.isVerified set to true in DB", async () => {
    const { session, otp } = await seedOtpSession();

    await request(app)
      .post("/api/buyer/auth/email/verify-otp")
      .send({ otpSessionId: session._id.toString(), otp });

    const user = await User.findOne({ email: "buyer@test.com" });
    expect(user!.isVerified).toBe(true);
  });
});
