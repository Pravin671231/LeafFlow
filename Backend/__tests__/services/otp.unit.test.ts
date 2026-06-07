import { describe, it, expect } from "vitest";
import { generateOtp, hashOtp, verifyOtp } from "../../src/services/otp";

describe("generateOtp", () => {
  it("U1: returns a 6-digit numeric string", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });
});

describe("hashOtp", () => {
  it("U2: returns a hash different from the plain OTP", async () => {
    const otp = "123456";
    const hash = await hashOtp(otp);
    expect(hash).not.toBe(otp);
    expect(hash.length).toBeGreaterThan(10);
  });
});

describe("verifyOtp", () => {
  it("U3: returns true for the correct OTP", async () => {
    const otp = "654321";
    const hash = await hashOtp(otp);
    expect(await verifyOtp(otp, hash)).toBe(true);
  });

  it("U4: returns false for a wrong OTP", async () => {
    const otp = "111111";
    const hash = await hashOtp(otp);
    expect(await verifyOtp("999999", hash)).toBe(false);
  });
});
