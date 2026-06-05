import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../config/db.js";
import { Admin } from "../models/Admin.js";

const REQUIRED_VARS = ["MONGODB_URI", "ADMIN_LOGIN_EMAIL", "ADMIN_PASSWORD"] as const;

async function seed(): Promise<void> {
  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      console.error(`Missing required environment variable: ${key}`);
      process.exit(1);
    }
  }

  const loginEmail = process.env.ADMIN_LOGIN_EMAIL as string;
  const otpDeliveryEmail = process.env.ADMIN_OTP_EMAIL ?? loginEmail;
  const password = process.env.ADMIN_PASSWORD as string;

  await connectDB();

  try {
    const existing = await Admin.findOne({ loginEmail });

    if (existing) {
      console.log("Admin already exists, skipping");
      await disconnectDB();
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await Admin.create({
      loginEmail,
      otpDeliveryEmail,
      passwordHash,
      name: "Admin",
      role: "admin",
    });

    console.log("Admin seeded successfully");
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    await disconnectDB();
    process.exit(1);
  }
}

seed();
