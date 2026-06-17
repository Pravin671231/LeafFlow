import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { User } from "../../src/models/User";
import { RefreshToken } from "../../src/models/RefreshToken";
import { OtpSession } from "../../src/models/OtpSession";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";

const { mockGenerateAuthUrl, mockGetToken, mockVerifyIdToken } = vi.hoisted(() => ({
  mockGenerateAuthUrl: vi
    .fn()
    .mockReturnValue("https://accounts.google.com/o/oauth2/auth?mock=1"),
  mockGetToken: vi.fn().mockResolvedValue({ tokens: { id_token: "mock-id-token" } }),
  mockVerifyIdToken: vi.fn().mockResolvedValue({
    getPayload: () => ({ sub: "google-uid-123", email: "buyer@gmail.com", name: "Google Buyer" }),
  }),
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn(function () {
    return {
      generateAuthUrl: mockGenerateAuthUrl,
      getToken: mockGetToken,
      verifyIdToken: mockVerifyIdToken,
    };
  }),
}));

beforeAll(async () => {
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/buyer/auth/google/callback";
  await connectTestDb();
});
afterAll(disconnectTestDb);
beforeEach(async () => {
  vi.clearAllMocks();
  mockGenerateAuthUrl.mockReturnValue("https://accounts.google.com/o/oauth2/auth?mock=1");
  mockGetToken.mockResolvedValue({ tokens: { id_token: "mock-id-token" } });
  mockVerifyIdToken.mockResolvedValue({
    getPayload: () => ({ sub: "google-uid-123", email: "buyer@gmail.com", name: "Google Buyer" }),
  });
  await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({}), OtpSession.deleteMany({})]);
});

describe("GET /api/buyer/auth/google", () => {
  it("G6: redirects to Google consent URL", async () => {
    const res = await request(app).get("/api/buyer/auth/google");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("accounts.google.com");
  });
});

describe("GET /api/buyer/auth/google/callback", () => {
  it("G7: new Google user → 200, tokens issued, User created with isVerified true", async () => {
    const res = await request(app)
      .get("/api/buyer/auth/google/callback")
      .query({ code: "mock-auth-code" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.accessToken");

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);

    const user = await User.findOne({ email: "buyer@gmail.com" });
    expect(user).not.toBeNull();
    expect(user!.googleId).toBe("google-uid-123");
    expect(user!.isVerified).toBe(true);
  });

  it("G8: existing OTP buyer with same email → googleId linked, no duplicate User", async () => {
    await User.create({ email: "buyer@gmail.com", isVerified: true });

    const res = await request(app)
      .get("/api/buyer/auth/google/callback")
      .query({ code: "mock-auth-code" });

    expect(res.status).toBe(200);

    const count = await User.countDocuments({ email: "buyer@gmail.com" });
    expect(count).toBe(1);

    const user = await User.findOne({ email: "buyer@gmail.com" });
    expect(user!.googleId).toBe("google-uid-123");
  });

  it("G9: missing code param → 400", async () => {
    const res = await request(app).get("/api/buyer/auth/google/callback");

    expect(res.status).toBe(400);
  });
});

describe("POST /api/buyer/auth/google/one-tap", () => {
  it("G10: new user via One Tap → 200, tokens issued, User created with isVerified true", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/google/one-tap")
      .send({ credential: "mock-one-tap-credential" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.accessToken");

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);

    const user = await User.findOne({ email: "buyer@gmail.com" });
    expect(user!.googleId).toBe("google-uid-123");
    expect(user!.isVerified).toBe(true);
  });

  it("G11: One Tap email matches existing OTP buyer → googleId merged, one User doc", async () => {
    await User.create({ email: "buyer@gmail.com", isVerified: true });

    const res = await request(app)
      .post("/api/buyer/auth/google/one-tap")
      .send({ credential: "mock-one-tap-credential" });

    expect(res.status).toBe(200);

    const count = await User.countDocuments({ email: "buyer@gmail.com" });
    expect(count).toBe(1);

    const user = await User.findOne({ email: "buyer@gmail.com" });
    expect(user!.googleId).toBe("google-uid-123");
  });

  it("G12: missing credential → 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/google/one-tap")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
  });
});
