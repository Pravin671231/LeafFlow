import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../src/utils/shared/password.utils";



describe("hashPassword", () => {
  it("U1: returns a hash different from the plain password", async () => {
    const password = "myPassword123";
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(10);
  });
});

describe("verifyPassword", () => {
  it("U2: returns true for the correct password", async () => {
    const password = "myPassword123";
    const hash = await hashPassword(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it("U3: returns false for a wrong password", async () => {
    const password = "myPassword123";
    const hash = await hashPassword(password);
    expect(await verifyPassword("wrongPassword", hash)).toBe(false);
  });
});
