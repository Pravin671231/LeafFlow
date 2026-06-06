import { describe, it, expect } from "vitest";
import { RefreshToken } from "../../src/models/RefreshToken";

describe("RefreshToken model", () => {
  it("rejects a document missing required fields", () => {
    const doc = new RefreshToken({});
    const err = doc.validateSync();
    expect(err?.errors["tokenHash"]).toBeDefined();
    expect(err?.errors["role"]).toBeDefined();
    expect(err?.errors["expiresAt"]).toBeDefined();
  });

  it("rejects an invalid role value", () => {
    const doc = new RefreshToken({
      tokenHash: "abc123",
      role: "superadmin",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const err = doc.validateSync();
    expect(err?.errors["role"]).toBeDefined();
  });

  it("accepts valid role values", () => {
    for (const role of ["admin", "buyer"] as const) {
      const doc = new RefreshToken({
        tokenHash: "abc123",
        role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      expect(doc.validateSync()).toBeUndefined();
    }
  });

  it("accepts a document without revokedAt", () => {
    const doc = new RefreshToken({
      tokenHash: "abc123",
      role: "admin",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.revokedAt).toBeUndefined();
  });

  it("accepts a document without userId or adminId", () => {
    const doc = new RefreshToken({
      tokenHash: "abc123",
      role: "buyer",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    expect(doc.validateSync()).toBeUndefined();
  });
});
