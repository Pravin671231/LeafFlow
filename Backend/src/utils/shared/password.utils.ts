import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS_PASSWORD } from "../../config";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS_PASSWORD);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}