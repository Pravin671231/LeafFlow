import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { OtpSession } from "../../src/models/OtpSession";
import { hashOtp } from "../../src/services/otp";
import { connectTestDb, disconnectTestDb, clearCollections, seedAdmin } from "../helpers/seedAdmin";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearCollections);

describe("POST /api/admin/auth/login/verify-otp", () => {
  it("I5: correct OTP → 200, accessToken in body + refreshToken httpOnly cookie", async () => {
    const admin = await seedAdmin();
    const otp = "123456";
    const session = await OtpSession.create({
      purpose: "admin_login",
      identifier: admin.loginEmail,
      otpHash: await hashOtp(otp),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attemptCount: 0,
    });

    const res = await request(app)
      .post("/api/admin/auth/login/verify-otp")
      .send({ otpSessionId: session._id.toString(), otp });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);
  });

  it("I6: wrong OTP → 401 INVALID_OTP", async () => {
    const admin = await seedAdmin();
    const session = await OtpSession.create({
      purpose: "admin_login",
      identifier: admin.loginEmail,
      otpHash: await hashOtp("111111"),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attemptCount: 0,
    });

    const res = await request(app)
      .post("/api/admin/auth/login/verify-otp")
      .send({ otpSessionId: session._id.toString(), otp: "999999" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_OTP" });
  });

  it("I7: expired OtpSession → 401 OTP_EXPIRED", async () => {
    const admin = await seedAdmin();
    const session = await OtpSession.create({
      purpose: "admin_login",
      identifier: admin.loginEmail,
      otpHash: await hashOtp("123456"),
      expiresAt: new Date(Date.now() - 1000),
      attemptCount: 0,
    });

    const res = await request(app)
      .post("/api/admin/auth/login/verify-otp")
      .send({ otpSessionId: session._id.toString(), otp: "123456" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "OTP_EXPIRED" });
  });

  it("I8: attemptCount >= 5 → 429 OTP_MAX_ATTEMPTS", async () => {
    const admin = await seedAdmin();
    const session = await OtpSession.create({
      purpose: "admin_login",
      identifier: admin.loginEmail,
      otpHash: await hashOtp("111111"),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attemptCount: 5,
    });

    const res = await request(app)
      .post("/api/admin/auth/login/verify-otp")
      .send({ otpSessionId: session._id.toString(), otp: "111111" });

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ success: false, code: "OTP_MAX_ATTEMPTS" });
  });
});
