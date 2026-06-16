import { vi, describe, it, expect, beforeEach } from "vitest";
import { MAX_OTP_ATTEMPTS, OTP_TTL_MS } from "../../src/config/constants";
import { issueOtpSession, consumeOtpSession } from "../../src/services/otp.service";

const {
  mockSave, mockCreate, mockFindById, mockDeleteOne,
  mockSendOtpEmail, mockGenerateOtp, mockHashOtp, mockVerifyOtp,
} = vi.hoisted(() => ({
  mockSave: vi.fn(),
  mockCreate: vi.fn(),
  mockFindById: vi.fn(),
  mockDeleteOne: vi.fn(),
  mockSendOtpEmail: vi.fn(),
  mockGenerateOtp: vi.fn().mockReturnValue("123456"),
  mockHashOtp: vi.fn().mockResolvedValue("hashed_otp"),
  mockVerifyOtp: vi.fn(),
}));

vi.mock("../../src/models", () => ({
  OtpSession: {
    create: mockCreate,
    findById: mockFindById,
    deleteOne: mockDeleteOne,
  },
}));

vi.mock("../../src/services/integrations/email.service", () => ({
  sendOtpEmail: mockSendOtpEmail,
}));

vi.mock("../../src/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/utils")>()),
  generateOtp: mockGenerateOtp,
  hashOtp: mockHashOtp,
  verifyOtp: mockVerifyOtp,
}));


const MOCK_SESSION_ID = "507f1f77bcf86cd799439011";
const MOCK_PURPOSE = "admin_login" as const;
const MOCK_IDENTIFIER = "admin@leafflow.com";
const MOCK_EMAIL = "otp@leafflow.com";

function makeMockSession(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => MOCK_SESSION_ID },
    purpose: MOCK_PURPOSE,
    identifier: MOCK_IDENTIFIER,
    otpHash: "hashed_otp",
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attemptCount: 0,
    save: mockSave,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("issueOtpSession", () => {
  it("S1: happy path — creates session, sends email, returns session id string", async () => {
    const mockSession = makeMockSession();
    mockCreate.mockResolvedValue(mockSession);
    mockSendOtpEmail.mockResolvedValue(undefined);

    const result = await issueOtpSession(MOCK_PURPOSE, MOCK_IDENTIFIER, MOCK_EMAIL);

    expect(mockCreate).toHaveBeenCalledOnce();
    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg.purpose).toBe(MOCK_PURPOSE);
    expect(createArg.identifier).toBe(MOCK_IDENTIFIER);
    expect(createArg.otpHash).toBe("hashed_otp");
    expect(createArg.attemptCount).toBe(0);

    expect(mockSendOtpEmail).toHaveBeenCalledOnce();
    expect(mockSendOtpEmail).toHaveBeenCalledWith(MOCK_EMAIL, "123456");

    expect(result).toBe(MOCK_SESSION_ID);
  });

  it("S2: expiresAt is set within OTP_TTL_MS window (±200 ms)", async () => {
    const before = Date.now();
    mockCreate.mockResolvedValue(makeMockSession());
    mockSendOtpEmail.mockResolvedValue(undefined);

    await issueOtpSession(MOCK_PURPOSE, MOCK_IDENTIFIER, MOCK_EMAIL);

    const createArg = mockCreate.mock.calls[0][0];
    const expiresAt: Date = createArg.expiresAt;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + OTP_TTL_MS - 200);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + OTP_TTL_MS + 200);
  });

  it("S3: email delivery fails — deletes session and throws AppError 503", async () => {
    const mockSession = makeMockSession();
    mockCreate.mockResolvedValue(mockSession);
    mockSendOtpEmail.mockRejectedValue(new Error("SMTP error"));

    await expect(issueOtpSession(MOCK_PURPOSE, MOCK_IDENTIFIER, MOCK_EMAIL)).rejects.toMatchObject({
      statusCode: 503,
      code: "EMAIL_DELIVERY_FAILED",
    });

    expect(mockDeleteOne).toHaveBeenCalledOnce();
    expect(mockDeleteOne).toHaveBeenCalledWith({ _id: mockSession._id });
  });

  it("S4: OtpSession.create throws — error propagates, sendOtpEmail never called", async () => {
    mockCreate.mockRejectedValue(new Error("DB error"));

    await expect(issueOtpSession(MOCK_PURPOSE, MOCK_IDENTIFIER, MOCK_EMAIL)).rejects.toThrow("DB error");
    expect(mockSendOtpEmail).not.toHaveBeenCalled();
  });
});

describe("consumeOtpSession", () => {
  it("S5: session not found — throws AppError 401 INVALID_OTP", async () => {
    mockFindById.mockResolvedValue(null);

    await expect(consumeOtpSession(MOCK_SESSION_ID, "123456", MOCK_PURPOSE)).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_OTP",
      message: "Invalid OTP session",
    });
  });

  it("S6: purpose mismatch — throws AppError 401 INVALID_OTP", async () => {
    mockFindById.mockResolvedValue(makeMockSession({ purpose: "admin_forgot" }));

    await expect(consumeOtpSession(MOCK_SESSION_ID, "123456", MOCK_PURPOSE)).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_OTP",
      message: "Invalid OTP session",
    });
  });

  it("S7: session expired — throws AppError 401 OTP_EXPIRED", async () => {
    mockFindById.mockResolvedValue(makeMockSession({ expiresAt: new Date(Date.now() - 1000) }));

    await expect(consumeOtpSession(MOCK_SESSION_ID, "123456", MOCK_PURPOSE)).rejects.toMatchObject({
      statusCode: 401,
      code: "OTP_EXPIRED",
    });
  });

  it("S8: attemptCount >= MAX_OTP_ATTEMPTS — throws AppError 429 OTP_MAX_ATTEMPTS", async () => {
    mockFindById.mockResolvedValue(makeMockSession({ attemptCount: MAX_OTP_ATTEMPTS }));

    await expect(consumeOtpSession(MOCK_SESSION_ID, "123456", MOCK_PURPOSE)).rejects.toMatchObject({
      statusCode: 429,
      code: "OTP_MAX_ATTEMPTS",
    });
  });

  it("S9: wrong OTP — increments attemptCount, saves, throws AppError 401 INVALID_OTP", async () => {
    const session = makeMockSession({ attemptCount: 2 });
    mockFindById.mockResolvedValue(session);
    mockVerifyOtp.mockResolvedValue(false);

    await expect(consumeOtpSession(MOCK_SESSION_ID, "999999", MOCK_PURPOSE)).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_OTP",
      message: "Invalid OTP",
    });

    expect(session.attemptCount).toBe(3);
    expect(mockSave).toHaveBeenCalledOnce();
  });

  it("S10: correct OTP — deletes session, returns { identifier }", async () => {
    const session = makeMockSession();
    mockFindById.mockResolvedValue(session);
    mockVerifyOtp.mockResolvedValue(true);

    const result = await consumeOtpSession(MOCK_SESSION_ID, "123456", MOCK_PURPOSE);

    expect(mockDeleteOne).toHaveBeenCalledOnce();
    expect(mockDeleteOne).toHaveBeenCalledWith({ _id: session._id });
    expect(result).toEqual({ identifier: MOCK_IDENTIFIER });
  });

  it("S11: boundary — attemptCount === MAX_OTP_ATTEMPTS - 1 with correct OTP succeeds", async () => {
    const session = makeMockSession({ attemptCount: MAX_OTP_ATTEMPTS - 1 });
    mockFindById.mockResolvedValue(session);
    mockVerifyOtp.mockResolvedValue(true);

    const result = await consumeOtpSession(MOCK_SESSION_ID, "123456", MOCK_PURPOSE);

    expect(result).toEqual({ identifier: MOCK_IDENTIFIER });
    expect(mockDeleteOne).toHaveBeenCalledOnce();
  });
});
