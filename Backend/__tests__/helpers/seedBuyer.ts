import { User } from "../../src/models/User";
import { OtpSession } from "../../src/models/OtpSession";
import { RefreshToken } from "../../src/models/RefreshToken";

export async function seedBuyer(overrides: Record<string, unknown> = {}) {
  return User.create({
    email: "buyer@test.com",
    name: "Test Buyer",
    isVerified: true,
    role: "buyer",
    ...overrides,
  });
}

export async function clearBuyerCollections() {
  await Promise.all([
    User.deleteMany({}),
    OtpSession.deleteMany({}),
    RefreshToken.deleteMany({}),
  ]);
}
