import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

const sendMailMock = vi.fn().mockResolvedValue({ messageId: "test-id" });
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
  },
}));

const mockGetPayload = vi.fn().mockReturnValue({
  sub: "google-sub-123",
  email: "buyer@test.com",
  name: "Test Buyer",
});
const mockVerifyIdToken = vi.fn().mockResolvedValue({ getPayload: mockGetPayload });
const mockGenerateAuthUrl = vi.fn().mockReturnValue("https://accounts.google.com/auth?mock");
const mockGetToken = vi.fn().mockResolvedValue({ tokens: { id_token: "mock-id-token" } });
const mockSetCredentials = vi.fn();

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
    generateAuthUrl: mockGenerateAuthUrl,
    getToken: mockGetToken,
    setCredentials: mockSetCredentials,
  })),
}));

import { Types } from "mongoose";
import { User } from "../../src/models/User";
import { OtpSession } from "../../src/models/OtpSession";
import { RefreshToken } from "../../src/models/RefreshToken";
import { hashOtp } from "../../src/services/otp";
import * as buyerAuthService from "../../src/services/buyerAuth.service";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";
import { clearBuyerCollections, seedBuyer } from "../helpers/seedBuyer";

beforeAll(async () => {
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/buyer/auth/google/callback";
  await connectTestDb();
});
afterAll(disconnectTestDb);
beforeEach(async () => {
  await clearBuyerCollections();
  sendMailMock.mockClear();
  mockVerifyIdToken.mockResolvedValue({ getPayload: mockGetPayload });
  mockGetToken.mockResolvedValue({ tokens: { id_token: "mock-id-token" } });
  mockGetPayload.mockReturnValue({ sub: "google-sub-123", email: "buyer@test.com", name: "Test Buyer" });
});

// ─── sendOtp ──────────────────────────────────────────────────────────────────

describe("sendOtp", () => {
  it("U10: new email → creates User, OtpSession, calls sendOtpEmail, returns otpSessionId", async () => {
    const result = await buyerAuthService.sendOtp("buyer@test.com");

    expect(result).toHaveProperty("otpSessionId");
    expect(result.expiresInSeconds).toBe(300);

    const user = await User.findOne({ email: "buyer@test.com" });
    expect(user).not.toBeNull();
    expect(user!.isVerified).toBe(false);

    const session = await OtpSession.findById(result.otpSessionId);
    expect(session).not.toBeNull();
    expect(session!.purpose).toBe("buyer_login");

    expect(sendMailMock).toHaveBeenCalledOnce();
  });

  it("U11: existing user email → no new User created", async () => {
    await seedBuyer({ email: "buyer@test.com", isVerified: true });

    await buyerAuthService.sendOtp("buyer@test.com");

    const count = await User.countDocuments({ email: "buyer@test.com" });
    expect(count).toBe(1);
  });

  it("U12: sendOtpEmail throws → error swallowed, still returns otpSessionId", async () => {
    sendMailMock.mockRejectedValueOnce(new Error("SMTP error"));

    const result = await buyerAuthService.sendOtp("buyer@test.com");
    expect(result.otpSessionId).toBeDefined();
  });
});

// ─── verifyOtpAndIssueTokens ──────────────────────────────────────────────────

describe("verifyOtpAndIssueTokens", () => {
  async function seedSession(overrides: Partial<{
    purpose: string;
    expiresAt: Date;
    attemptCount: number;
    otp: string;
  }> = {}) {
    const user = await seedBuyer({ email: "buyer@test.com", isVerified: false });
    const otp = overrides.otp ?? "123456";
    const session = await OtpSession.create({
      purpose: overrides.purpose ?? "buyer_login",
      identifier: "buyer@test.com",
      otpHash: await hashOtp(otp),
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000),
      attemptCount: overrides.attemptCount ?? 0,
    });
    return { user, session, otp };
  }

  it("U13: correct OTP + valid session → sets isVerified: true, returns tokens", async () => {
    const { session, otp } = await seedSession();

    const result = await buyerAuthService.verifyOtpAndIssueTokens(session._id.toString(), otp);

    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("rawRefresh");

    const user = await User.findOne({ email: "buyer@test.com" });
    expect(user!.isVerified).toBe(true);
  });

  it("U14: already-verified user → no error, tokens issued normally", async () => {
    const { session, otp } = await seedSession();
    await User.findOneAndUpdate({ email: "buyer@test.com" }, { isVerified: true });

    const result = await buyerAuthService.verifyOtpAndIssueTokens(session._id.toString(), otp);
    expect(result).toHaveProperty("accessToken");
  });

  it("U15: wrong OTP → increments attemptCount, throws INVALID_OTP", async () => {
    const { session } = await seedSession();

    await expect(
      buyerAuthService.verifyOtpAndIssueTokens(session._id.toString(), "000000")
    ).rejects.toMatchObject({ code: "INVALID_OTP", statusCode: 401 });

    const updated = await OtpSession.findById(session._id);
    expect(updated!.attemptCount).toBe(1);
  });

  it("U16: expired session → throws OTP_EXPIRED", async () => {
    const { session, otp } = await seedSession({ expiresAt: new Date(Date.now() - 1000) });

    await expect(
      buyerAuthService.verifyOtpAndIssueTokens(session._id.toString(), otp)
    ).rejects.toMatchObject({ code: "OTP_EXPIRED", statusCode: 401 });
  });

  it("U17: attemptCount >= 5 → throws OTP_MAX_ATTEMPTS", async () => {
    const { session, otp } = await seedSession({ attemptCount: 5 });

    await expect(
      buyerAuthService.verifyOtpAndIssueTokens(session._id.toString(), otp)
    ).rejects.toMatchObject({ code: "OTP_MAX_ATTEMPTS", statusCode: 429 });
  });

  it("U18: non-existent otpSessionId → throws INVALID_OTP", async () => {
    await expect(
      buyerAuthService.verifyOtpAndIssueTokens(new Types.ObjectId().toString(), "123456")
    ).rejects.toMatchObject({ code: "INVALID_OTP", statusCode: 401 });
  });

  it("U19: session with wrong purpose → throws INVALID_OTP", async () => {
    const { session, otp } = await seedSession({ purpose: "admin_login" });

    await expect(
      buyerAuthService.verifyOtpAndIssueTokens(session._id.toString(), otp)
    ).rejects.toMatchObject({ code: "INVALID_OTP", statusCode: 401 });
  });
});

// ─── handleGoogleOneTap ───────────────────────────────────────────────────────

describe("handleGoogleOneTap", () => {
  it("U20: valid credential, new email → creates User with isVerified: true, returns tokens", async () => {
    const result = await buyerAuthService.handleGoogleOneTap("valid-credential");

    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("rawRefresh");

    const user = await User.findOne({ email: "buyer@test.com" });
    expect(user).not.toBeNull();
    expect(user!.isVerified).toBe(true);
    expect(user!.googleId).toBe("google-sub-123");
  });

  it("U21: email matches existing user without googleId → merges googleId (account linking)", async () => {
    await seedBuyer({ email: "buyer@test.com", googleId: undefined });

    await buyerAuthService.handleGoogleOneTap("valid-credential");

    const users = await User.find({ email: "buyer@test.com" });
    expect(users).toHaveLength(1);
    expect(users[0].googleId).toBe("google-sub-123");
  });

  it("U22: googleId already on existing user → no duplicate User created", async () => {
    await seedBuyer({ email: "buyer@test.com", googleId: "google-sub-123" });

    await buyerAuthService.handleGoogleOneTap("valid-credential");

    const count = await User.countDocuments({ email: "buyer@test.com" });
    expect(count).toBe(1);
  });

  it("U23: verifyIdToken throws → throws INVALID_TOKEN", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("Invalid token"));

    await expect(buyerAuthService.handleGoogleOneTap("bad-credential")).rejects.toMatchObject({
      code: "INVALID_TOKEN",
      statusCode: 401,
    });
  });

  it("U24: Google payload has no email → throws INVALID_TOKEN", async () => {
    mockGetPayload.mockReturnValueOnce({ sub: "g-123", email: undefined, name: "No Email" });

    await expect(buyerAuthService.handleGoogleOneTap("valid-credential")).rejects.toMatchObject({
      code: "INVALID_TOKEN",
      statusCode: 401,
    });
  });
});

// ─── handleGoogleCallback ─────────────────────────────────────────────────────

describe("handleGoogleCallback", () => {
  it("U25: valid code → getToken succeeds, user created, returns tokens", async () => {
    const result = await buyerAuthService.handleGoogleCallback("valid-code");

    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("rawRefresh");

    const user = await User.findOne({ email: "buyer@test.com" });
    expect(user).not.toBeNull();
  });

  it("U26: email matches existing user without googleId → merges googleId", async () => {
    await seedBuyer({ email: "buyer@test.com", googleId: undefined });

    await buyerAuthService.handleGoogleCallback("valid-code");

    const users = await User.find({ email: "buyer@test.com" });
    expect(users).toHaveLength(1);
    expect(users[0].googleId).toBe("google-sub-123");
  });

  it("U27: getToken rejects → error propagates", async () => {
    mockGetToken.mockRejectedValueOnce(new Error("invalid_grant"));

    await expect(buyerAuthService.handleGoogleCallback("bad-code")).rejects.toThrow();
  });

  it("U28: id_token missing from Google response → throws INVALID_TOKEN", async () => {
    mockGetToken.mockResolvedValueOnce({ tokens: {} });

    await expect(buyerAuthService.handleGoogleCallback("valid-code")).rejects.toMatchObject({
      code: "INVALID_TOKEN",
      statusCode: 401,
    });
  });
});

// ─── refreshBuyerAccessToken ──────────────────────────────────────────────────

describe("refreshBuyerAccessToken", () => {
  it("U29: valid raw token → returns new accessToken with role: buyer", async () => {
    const user = await seedBuyer();
    const { createBuyerRefreshToken } = await import("../../src/services/token");
    const raw = await createBuyerRefreshToken(user._id as Types.ObjectId);

    const result = await buyerAuthService.refreshBuyerAccessToken(raw);
    expect(result).toHaveProperty("accessToken");

    const [, payloadB64] = result.accessToken.split(".");
    const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    expect(decoded.role).toBe("buyer");
  });

  it("U30: invalid token → throws INVALID_REFRESH_TOKEN", async () => {
    await expect(buyerAuthService.refreshBuyerAccessToken("bad-token")).rejects.toMatchObject({
      code: "INVALID_REFRESH_TOKEN",
      statusCode: 401,
    });
  });
});

// ─── logoutBuyer ─────────────────────────────────────────────────────────────

describe("logoutBuyer", () => {
  it("U31: valid raw token → RefreshToken doc gets revokedAt set", async () => {
    const user = await seedBuyer();
    const { createBuyerRefreshToken } = await import("../../src/services/token");
    const raw = await createBuyerRefreshToken(user._id as Types.ObjectId);

    await buyerAuthService.logoutBuyer(raw);

    const doc = await RefreshToken.findOne({ role: "buyer", userId: user._id });
    expect(doc?.revokedAt).toBeDefined();
  });

  it("U32: raw is undefined → no-op, no throw", async () => {
    await expect(buyerAuthService.logoutBuyer(undefined)).resolves.toBeUndefined();
  });

  it("U33: invalid token → swallowed, no throw", async () => {
    await expect(buyerAuthService.logoutBuyer("invalid-raw-token")).resolves.toBeUndefined();
  });
});

// ─── getBuyerProfile ──────────────────────────────────────────────────────────

describe("getBuyerProfile", () => {
  it("U34: valid userId → returns User document", async () => {
    const user = await seedBuyer();

    const result = await buyerAuthService.getBuyerProfile(user._id.toString());
    expect(result.email).toBe("buyer@test.com");
  });

  it("U35: non-existent userId → throws NOT_FOUND", async () => {
    await expect(
      buyerAuthService.getBuyerProfile(new Types.ObjectId().toString())
    ).rejects.toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
  });
});
