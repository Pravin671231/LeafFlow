import { describe, it, expect } from "vitest";
import { OtpSession } from "../../src/models/OtpSession";

describe("OtpSession model", () => {
  it("rejects a document missing required fields", () => {
    const doc = new OtpSession({});
    const err = doc.validateSync();
    expect(err?.errors["purpose"]).toBeDefined();
    expect(err?.errors["identifier"]).toBeDefined();
    expect(err?.errors["otpHash"]).toBeDefined();
    expect(err?.errors["expiresAt"]).toBeDefined();
  });

  it("rejects an invalid purpose value", () => {
    const doc = new OtpSession({
      purpose: "invalid_purpose",
      identifier: "user@example.com",
      otpHash: "hashedotp",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    const err = doc.validateSync();
    expect(err?.errors["purpose"]).toBeDefined();
  });

  it("accepts all valid purpose values", () => {
    const purposes = ["admin_login", "admin_forgot", "admin_reset", "buyer_login"] as const;
    for (const purpose of purposes) {
      const doc = new OtpSession({
        purpose,
        identifier: "user@example.com",
        otpHash: "hashedotp",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      expect(doc.validateSync()).toBeUndefined();
    }
  });

  it("defaults attemptCount to 0", () => {
    const doc = new OtpSession({
      purpose: "admin_login",
      identifier: "user@example.com",
      otpHash: "hashedotp",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    expect(doc.attemptCount).toBe(0);
  });
});
