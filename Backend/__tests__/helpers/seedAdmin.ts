import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Admin, IAdmin } from "../../src/models/Admin";

const MONGO_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/leafflow_test";

export async function connectTestDb() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }
}

export async function disconnectTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

export async function clearCollections() {
  const { Admin } = await import("../../src/models/Admin");
  const { OtpSession } = await import("../../src/models/OtpSession");
  const { RefreshToken } = await import("../../src/models/RefreshToken");
  await Promise.all([Admin.deleteMany({}), OtpSession.deleteMany({}), RefreshToken.deleteMany({})]);
}

export async function seedAdmin(overrides: Record<string, unknown> = {}) {
  const passwordHash = await bcrypt.hash("Password123!", 12);
  return Admin.create({
    loginEmail: "admin@leafflow.com",
    otpDeliveryEmail: "otp@leafflow.com",
    passwordHash,
    name: "Test Admin",
    role: "admin",
    isActive: true,
    failedLoginAttempts: 0,
    ...overrides,
  });
}
