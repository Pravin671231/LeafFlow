import { describe, it, expect } from "vitest";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../src/services/token.service";

const payload = { id: "507f1f77bcf86cd799439011", role: "admin"};

function decodeHeader(token: string) {
  return JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
}

describe("generateAccessToken", () => {
  it("U5: returns a JWT string signed with HS256", () => {
    const token = generateAccessToken(payload);
    expect(typeof token).toBe("string");
    expect(decodeHeader(token).alg).toBe("HS256");
  });
});

describe("verifyAccessToken", () => {
  it("U6: returns original payload for a valid access token", () => {
    const token = generateAccessToken(payload);
    const result = verifyAccessToken(token);
    expect(result.id).toBe(payload.id);
    expect(result.role).toBe(payload.role);
  });

  it("U7: throws for an invalid/malformed token string", () => {
    expect(() => verifyAccessToken("bad.token.here")).toThrow();
  });

  it("U8: throws for a tampered access token", () => {
    const token = generateAccessToken(payload);
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe("generateRefreshToken", () => {
  it("U9: returns a JWT string signed with HS256", () => {
    const token = generateRefreshToken(payload);
    expect(typeof token).toBe("string");
    expect(decodeHeader(token).alg).toBe("HS256");
  });
});

describe("verifyRefreshToken", () => {
  it("U10: returns original payload for a valid refresh token", () => {
    const token = generateRefreshToken(payload);
    const result = verifyRefreshToken(token);
    expect(result.id).toBe(payload.id);
  });

  it("U11: throws for an invalid/malformed token string", () => {
    expect(() => verifyRefreshToken("bad.token.here")).toThrow();
  });
});

describe("cross-secret isolation", () => {
  it("U12: refresh token is rejected by verifyAccessToken", () => {
    const refreshToken = generateRefreshToken(payload);
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });

  it("U13: access token is rejected by verifyRefreshToken", () => {
    const accessToken = generateAccessToken(payload);
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});
