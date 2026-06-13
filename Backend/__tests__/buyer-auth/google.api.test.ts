import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }) })),
  },
}));

const mockGetPayload = vi.fn().mockReturnValue({
  sub: "google-sub-123",
  email: "buyer@test.com",
  name: "Test Buyer",
});
const mockVerifyIdToken = vi.fn().mockResolvedValue({ getPayload: mockGetPayload });
const mockGenerateAuthUrl = vi.fn().mockReturnValue("https://accounts.google.com/auth?mock=1");
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

import app from "../../src/app";
import { User } from "../../src/models/User";
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
  mockVerifyIdToken.mockResolvedValue({ getPayload: mockGetPayload });
  mockGetToken.mockResolvedValue({ tokens: { id_token: "mock-id-token" } });
  mockGetPayload.mockReturnValue({ sub: "google-sub-123", email: "buyer@test.com", name: "Test Buyer" });
  mockSetCredentials.mockClear();
});

describe("POST /api/buyer/auth/google/one-tap", () => {
  it("I15: valid credential, new user → 200, User created with isVerified: true", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/google/one-tap")
      .send({ credential: "valid-credential" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.accessToken");

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);

    const user = await User.findOne({ email: "buyer@test.com" });
    expect(user).not.toBeNull();
    expect(user!.isVerified).toBe(true);
  });

  it("I16: email matches existing user without googleId → googleId merged (account linking)", async () => {
    await seedBuyer({ email: "buyer@test.com", googleId: undefined });

    const res = await request(app)
      .post("/api/buyer/auth/google/one-tap")
      .send({ credential: "valid-credential" });

    expect(res.status).toBe(200);

    const users = await User.find({ email: "buyer@test.com" });
    expect(users).toHaveLength(1);
    expect(users[0].googleId).toBe("google-sub-123");
  });

  it("I17: returning Google user → no duplicate User created", async () => {
    await seedBuyer({ email: "buyer@test.com", googleId: "google-sub-123" });

    await request(app)
      .post("/api/buyer/auth/google/one-tap")
      .send({ credential: "valid-credential" });

    const count = await User.countDocuments({ email: "buyer@test.com" });
    expect(count).toBe(1);
  });

  it("I18: invalid credential → 401 INVALID_TOKEN", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("Invalid token"));

    const res = await request(app)
      .post("/api/buyer/auth/google/one-tap")
      .send({ credential: "bad-credential" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_TOKEN" });
  });

  it("I19: missing credential field → 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/buyer/auth/google/one-tap")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
  });
});

describe("GET /api/buyer/auth/google", () => {
  it("I20: redirects to Google OAuth URL", async () => {
    const res = await request(app).get("/api/buyer/auth/google");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("accounts.google.com");
  });
});

describe("GET /api/buyer/auth/google/callback", () => {
  it("I21: valid code → 200, accessToken in body + refreshToken cookie", async () => {
    const res = await request(app).get("/api/buyer/auth/google/callback?code=valid-code");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data.accessToken");

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);
  });

  it("I22: missing code query param → 400 VALIDATION_ERROR", async () => {
    const res = await request(app).get("/api/buyer/auth/google/callback");

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
  });

  it("I23: invalid code (getToken rejects) → 401 INVALID_TOKEN", async () => {
    mockGetToken.mockRejectedValueOnce(new Error("invalid_grant"));

    const res = await request(app).get("/api/buyer/auth/google/callback?code=bad-code");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "INVALID_TOKEN" });
  });
});
