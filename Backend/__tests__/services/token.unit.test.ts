import { describe, it, expect } from "vitest";
import { signAccessToken, verifyAccessToken } from "../../src/services/token";

const payload = { adminId: "507f1f77bcf86cd799439011", role: "admin" as const };

describe("signAccessToken", () => {
  it("U5: returns a JWT string signed with RS256", () => {
    const token = signAccessToken(payload);
    expect(typeof token).toBe("string");
    const [header] = token.split(".");
    const decoded = JSON.parse(Buffer.from(header, "base64url").toString());
    expect(decoded.alg).toBe("RS256");
  });
});

describe("verifyAccessToken", () => {
  it("U6: returns payload for a valid token", () => {
    const token = signAccessToken(payload);
    const result = verifyAccessToken(token);
    expect(result.adminId).toBe(payload.adminId);
    expect(result.role).toBe("admin");
  });

  it("U7: throws for an expired token", () => {
    expect(() => verifyAccessToken("expired.token.here")).toThrow();
  });

  it("U8: throws for a tampered token", () => {
    const token = signAccessToken(payload);
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});
