import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { BCRYPT_ROUNDS_OTP } from "../../config";
import { isDevelopment } from "../../config/env";

export function generateOtp(): string {
  if (isDevelopment()) return "112233";
  return randomInt(100000, 1000000).toString();
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_ROUNDS_OTP);
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}