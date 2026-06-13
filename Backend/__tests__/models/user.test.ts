import { describe, it, expect } from "vitest";
import { User } from "../../src/models/User";

const validAddress = { line1: "12 MG Road", city: "Chennai", state: "Tamil Nadu", pincode: "600001" };

describe("User model", () => {
  it("U1 — rejects a document missing required fields", () => {
    const doc = new User({});
    const err = doc.validateSync();
    expect(err?.errors["email"]).toBeDefined();
    expect(err?.errors["name"]).toBeDefined();
  });

  it("U2 — accepts a document without googleId and phone", () => {
    const doc = new User({ email: "buyer@example.com", name: "Alice" });
    expect(doc.validateSync()).toBeUndefined();
  });

  it("U3 — defaults isVerified to false", () => {
    const doc = new User({ email: "buyer@example.com", name: "Alice" });
    expect(doc.isVerified).toBe(false);
  });

  it("U4 — defaults role to buyer", () => {
    const doc = new User({ email: "buyer@example.com", name: "Alice" });
    expect(doc.role).toBe("buyer");
  });

  it("U5 — defaults addresses to an empty array", () => {
    const doc = new User({ email: "buyer@example.com", name: "Alice" });
    expect(doc.addresses).toEqual([]);
  });

  it("U6 — lowercases the email", () => {
    const doc = new User({ email: "Test@Example.COM", name: "Alice" });
    expect(doc.email).toBe("test@example.com");
  });

  it("U7 — rejects an address entry missing required sub-fields", () => {
    const doc = new User({ email: "buyer@example.com", name: "Alice", addresses: [{}] });
    const err = doc.validateSync();
    expect(err?.errors["addresses.0.line1"]).toBeDefined();
    expect(err?.errors["addresses.0.city"]).toBeDefined();
    expect(err?.errors["addresses.0.state"]).toBeDefined();
    expect(err?.errors["addresses.0.pincode"]).toBeDefined();
  });

  it("U8 — accepts a valid address entry", () => {
    const doc = new User({
      email: "buyer@example.com",
      name: "Alice",
      addresses: [{ ...validAddress, isDefault: true }],
    });
    expect(doc.validateSync()).toBeUndefined();
  });

  it("U9 — defaults address isDefault to false", () => {
    const doc = new User({
      email: "buyer@example.com",
      name: "Alice",
      addresses: [validAddress],
    });
    expect(doc.addresses[0].isDefault).toBe(false);
  });
});
