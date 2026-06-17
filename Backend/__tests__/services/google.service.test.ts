import { describe, it, expect, vi, beforeAll } from "vitest";

const { mockGenerateAuthUrl, mockGetToken, mockVerifyIdToken } = vi.hoisted(() => ({
  mockGenerateAuthUrl: vi.fn().mockReturnValue("https://accounts.google.com/o/oauth2/auth?mock=1"),
  mockGetToken: vi.fn().mockResolvedValue({ tokens: { id_token: "mock-id-token" } }),
  mockVerifyIdToken: vi.fn().mockResolvedValue({
    getPayload: () => ({ sub: "google-uid-123", email: "buyer@gmail.com", name: "Test Buyer" }),
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

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/buyer/auth/google/callback";
});

describe("getGoogleAuthUrl", () => {
  it("G1: returns a Google consent URL string", async () => {
    const { getGoogleAuthUrl } = await import("../../src/services/integrations/google.service.js");
    const url = await getGoogleAuthUrl();

    expect(typeof url).toBe("string");
    expect(url).toContain("accounts.google.com");
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({ scope: expect.arrayContaining(["email", "profile"]) })
    );
  });
});

describe("verifyGoogleCode", () => {
  it("G2: exchanges code and returns GoogleProfile", async () => {
    const { verifyGoogleCode } = await import("../../src/services/integrations/google.service.js");
    const profile = await verifyGoogleCode("mock-auth-code");

    expect(profile).toMatchObject({
      googleId: "google-uid-123",
      email: "buyer@gmail.com",
      name: "Test Buyer",
    });
    expect(mockGetToken).toHaveBeenCalledWith("mock-auth-code");
  });

  it("G3: throws if Google returns no id_token", async () => {
    mockGetToken.mockResolvedValueOnce({ tokens: {} });
    const { verifyGoogleCode } = await import("../../src/services/integrations/google.service.js");

    await expect(verifyGoogleCode("bad-code")).rejects.toThrow();
  });
});

describe("verifyGoogleOneTap", () => {
  it("G4: verifies credential and returns GoogleProfile", async () => {
    const { verifyGoogleOneTap } = await import(
      "../../src/services/integrations/google.service.js"
    );
    const profile = await verifyGoogleOneTap("mock-credential-jwt");

    expect(profile).toMatchObject({
      googleId: "google-uid-123",
      email: "buyer@gmail.com",
      name: "Test Buyer",
    });
    expect(mockVerifyIdToken).toHaveBeenCalledWith(
      expect.objectContaining({ idToken: "mock-credential-jwt" })
    );
  });

  it("G5: throws if payload is missing", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ getPayload: () => null });
    const { verifyGoogleOneTap } = await import(
      "../../src/services/integrations/google.service.js"
    );

    await expect(verifyGoogleOneTap("invalid-jwt")).rejects.toThrow();
  });
});
