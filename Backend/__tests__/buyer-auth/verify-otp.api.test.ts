import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { User } from "../../src/models/User";
import { OtpSession } from "../../src/models/OtpSession";
import { RefreshToken } from "../../src/models/RefreshToken";
import { hashOtp } from "../../src/services/otp.service";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";

async function clearCollections() {
  await Promise.all([User.deleteMany({}), OtpSession.deleteMany({}), RefreshToken.deleteMany({})]);
}

async function seedBuyerWithOtpSession(otp: string, overrides: Record<string, unknown> = {}) {
  const user = await User.create({ email: "buyer@test.com", isVerified: false });
  const session = await OtpSession.create({
    purpose: "buyer_login",
    identifier: user.email,
    otpHash: await hashOtp(otp),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    attemptCount: 0,
    ...overrides,
  });
  return { user, session };
}

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearCollections);

describe("POST /api/buyer/auth/email/verify-otp", () => {
  it("B5: correct OTP → 200, accessToken in body, refreshToken httpOnly cookie, User.isVerified true", async () => {
    const otp = "123456";
    const { session } = await seedBuyerWithOtpSession(otp);

    const res = await request(app)
      .post("/api/buyer/auth/email/verify-otp")
      .send({ otpSessionId: session._id.toString(), otp });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.accessToken");

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);

    const user = await User.findOne({ email: "buyer@test.com" });
    expect(user!.isVerified).toBe(true);
  });

  it("B6: wrong OTP → 401 INVALID_OTP", async () => {
    const { session } = await seedBuyerWithOtpSession("111111");

    const res = await request(app)
      .post("/api/buyer/auth/email/verify-otp")
      .send({ otpSessionId: session._id.toString(), otp: "999999" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_OTP" });
  });

  it("B7: expired OtpSession → 401 OTP_EXPIRED", async () => {
    const { session } = await seedBuyerWithOtpSession("123456", {
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .post("/api/buyer/auth/email/verify-otp")
      .send({ otpSessionId: session._id.toString(), otp: "123456" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "OTP_EXPIRED" });
  });

  it("B8: attemptCount >= 5 → 429 OTP_MAX_ATTEMPTS", async () => {
    const { session } = await seedBuyerWithOtpSession("111111", { attemptCount: 5 });

    const res = await request(app)
      .post("/api/buyer/auth/email/verify-otp")
      .send({ otpSessionId: session._id.toString(), otp: "111111" });

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ success: false, code: "OTP_MAX_ATTEMPTS" });
  });

  it("B9: missing otpSessionId → 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/email/verify-otp")
      .send({ otp: "123456" });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
  });
});
