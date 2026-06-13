import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }) })),
  },
}));
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../src/app";
import { Admin } from "../../src/models/Admin";
import { OtpSession } from "../../src/models/OtpSession";
import { hashOtp } from "../../src/services/otp";
import { signAccessToken } from "../../src/services/token";
import { connectTestDb, disconnectTestDb, clearCollections, seedAdmin } from "../helpers/seedAdmin";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearCollections);

describe("POST /api/admin/auth/forgot-password/send-otp", () => {
  it("I14: unknown email → 200 (no enumeration leak)", async () => {
    const res = await request(app)
      .post("/api/admin/auth/forgot-password/send-otp")
      .send({ loginEmail: "nonexistent@leafflow.com" });

    expect(res.status).toBe(200);
  });

  it("I22: known email → 200, OtpSession created in DB", async () => {
    await seedAdmin();
    const res = await request(app)
      .post("/api/admin/auth/forgot-password/send-otp")
      .send({ loginEmail: "admin@leafflow.com" });

    expect(res.status).toBe(200);
    const session = await OtpSession.findOne({ purpose: "admin_forgot" });
    expect(session).not.toBeNull();
    expect(session!.otpHash).not.toMatch(/^\d{6}$/);
  });
});

describe("POST /api/admin/auth/forgot-password/reset", () => {
  it("I15: valid OTP → 200, passwordHash updated in DB", async () => {
    const admin = await seedAdmin();
    const otp = "789012";
    const session = await OtpSession.create({
      purpose: "admin_forgot",
      identifier: admin.loginEmail,
      otpHash: await hashOtp(otp),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attemptCount: 0,
    });

    const res = await request(app)
      .post("/api/admin/auth/forgot-password/reset")
      .send({ otpSessionId: session._id.toString(), otp, newPassword: "NewPassword123!" });

    expect(res.status).toBe(200);
    const updated = await Admin.findById(admin._id);
    expect(await bcrypt.compare("NewPassword123!", updated!.passwordHash)).toBe(true);
  });
});

describe("POST /api/admin/auth/forgot-password/reset — expiry and lockout", () => {
  it("I24: expired OTP session → 401 OTP_EXPIRED", async () => {
    const admin = await seedAdmin();
    const session = await OtpSession.create({
      purpose: "admin_forgot",
      identifier: admin.loginEmail,
      otpHash: await hashOtp("111111"),
      expiresAt: new Date(Date.now() - 1000),
      attemptCount: 0,
    });

    const res = await request(app)
      .post("/api/admin/auth/forgot-password/reset")
      .send({ otpSessionId: session._id.toString(), otp: "111111", newPassword: "NewPass123!" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "OTP_EXPIRED" });
  });

  it("I25: max OTP attempts → 429 OTP_MAX_ATTEMPTS", async () => {
    const admin = await seedAdmin();
    const session = await OtpSession.create({
      purpose: "admin_forgot",
      identifier: admin.loginEmail,
      otpHash: await hashOtp("111111"),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attemptCount: 5,
    });

    const res = await request(app)
      .post("/api/admin/auth/forgot-password/reset")
      .send({ otpSessionId: session._id.toString(), otp: "111111", newPassword: "NewPass123!" });

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ success: false, code: "OTP_MAX_ATTEMPTS" });
  });
});

describe("POST /api/admin/auth/reset-password (authenticated)", () => {
  it("I16: send-otp with valid JWT → 200", async () => {
    const admin = await seedAdmin();
    const token = signAccessToken({ adminId: admin._id.toString(), role: "admin" });

    const res = await request(app)
      .post("/api/admin/auth/reset-password/send-otp")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("I17: confirm with valid JWT + OTP → 200, password updated", async () => {
    const admin = await seedAdmin();
    const token = signAccessToken({ adminId: admin._id.toString(), role: "admin" });
    const otp = "321654";
    const session = await OtpSession.create({
      purpose: "admin_reset",
      identifier: admin.loginEmail,
      otpHash: await hashOtp(otp),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attemptCount: 0,
    });

    const res = await request(app)
      .post("/api/admin/auth/reset-password/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ otpSessionId: session._id.toString(), otp, newPassword: "Reset123!" });

    expect(res.status).toBe(200);
  });
});

describe("POST /api/admin/auth/forgot-password/reset — error paths", () => {
  it("I23: invalid/missing session → 401 INVALID_OTP", async () => {
    const res = await request(app)
      .post("/api/admin/auth/forgot-password/reset")
      .send({ otpSessionId: "000000000000000000000000", otp: "123456", newPassword: "NewPass123!" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_OTP" });
  });

  it("I19: wrong OTP → 401 INVALID_OTP", async () => {
    const admin = await seedAdmin();
    const session = await OtpSession.create({
      purpose: "admin_forgot",
      identifier: admin.loginEmail,
      otpHash: await hashOtp("111111"),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attemptCount: 0,
    });

    const res = await request(app)
      .post("/api/admin/auth/forgot-password/reset")
      .send({ otpSessionId: session._id.toString(), otp: "999999", newPassword: "NewPassword123!" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_OTP" });
  });
});

describe("POST /api/admin/auth/reset-password — error paths", () => {
  it("I26: resetPasswordConfirm expired OTP → 401 OTP_EXPIRED", async () => {
    const admin = await seedAdmin();
    const token = signAccessToken({ adminId: admin._id.toString(), role: "admin" });
    const session = await OtpSession.create({
      purpose: "admin_reset",
      identifier: admin.loginEmail,
      otpHash: await hashOtp("111111"),
      expiresAt: new Date(Date.now() - 1000),
      attemptCount: 0,
    });

    const res = await request(app)
      .post("/api/admin/auth/reset-password/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ otpSessionId: session._id.toString(), otp: "111111", newPassword: "NewPass123!" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "OTP_EXPIRED" });
  });

  it("I27: resetPasswordConfirm max attempts → 429 OTP_MAX_ATTEMPTS", async () => {
    const admin = await seedAdmin();
    const token = signAccessToken({ adminId: admin._id.toString(), role: "admin" });
    const session = await OtpSession.create({
      purpose: "admin_reset",
      identifier: admin.loginEmail,
      otpHash: await hashOtp("111111"),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attemptCount: 5,
    });

    const res = await request(app)
      .post("/api/admin/auth/reset-password/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ otpSessionId: session._id.toString(), otp: "111111", newPassword: "NewPass123!" });

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ success: false, code: "OTP_MAX_ATTEMPTS" });
  });
});

describe("POST /api/admin/auth/reset-password/confirm — error paths", () => {
  it("I20: invalid/missing session → 401 INVALID_OTP", async () => {
    const admin = await seedAdmin();
    const token = signAccessToken({ adminId: admin._id.toString(), role: "admin" });

    const res = await request(app)
      .post("/api/admin/auth/reset-password/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ otpSessionId: "000000000000000000000000", otp: "123456", newPassword: "NewPass123!" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_OTP" });
  });

  it("I21: wrong OTP in reset-password confirm → 401 INVALID_OTP", async () => {
    const admin = await seedAdmin();
    const token = signAccessToken({ adminId: admin._id.toString(), role: "admin" });
    const session = await OtpSession.create({
      purpose: "admin_reset",
      identifier: admin.loginEmail,
      otpHash: await hashOtp("111111"),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attemptCount: 0,
    });

    const res = await request(app)
      .post("/api/admin/auth/reset-password/confirm")
      .set("Authorization", `Bearer ${token}`)
      .send({ otpSessionId: session._id.toString(), otp: "999999", newPassword: "NewPass123!" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_OTP" });
  });
});

describe("OTP storage security", () => {
  it("I18: OtpSession stores hash, not plain 6-digit OTP", async () => {
    await seedAdmin();
    await request(app)
      .post("/api/admin/auth/login")
      .send({ loginEmail: "admin@leafflow.com", password: "Password123!" });

    const session = await OtpSession.findOne({ purpose: "admin_login" });
    expect(session).not.toBeNull();
    expect(session!.otpHash).not.toMatch(/^\d{6}$/);
  });
});
