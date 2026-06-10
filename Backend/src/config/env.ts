import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_PRIVATE_KEY: z.string().min(1, "JWT_PRIVATE_KEY is required"),
  JWT_PUBLIC_KEY: z.string().min(1, "JWT_PUBLIC_KEY is required"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_USER: z.string().min(1, "SMTP_USER is required"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS is required"),
  SMTP_PORT: z.coerce.number().default(587),
  MAIL_FROM: z.string().default("no-reply@leafflow.com"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${missing}`);
}

export const env = parsed.data;
export type Env = typeof env;
