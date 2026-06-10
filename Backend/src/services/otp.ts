import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { BCRYPT_ROUNDS_OTP } from "../config/constants";

export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_ROUNDS_OTP);
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
