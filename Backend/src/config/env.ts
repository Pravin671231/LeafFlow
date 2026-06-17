import dotenv from "dotenv";
import path from "path";

const NODE_ENV = process.env.NODE_ENV ?? "development";
const envFile =
  NODE_ENV === "production" ? ".env.prod" : NODE_ENV === "test" ? ".env.test" : ".env.dev";
dotenv.config({ path: path.resolve(__dirname, `../../${envFile}`) });

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  ACCESS_SECRET: z.string().min(32, "ACCESS_SECRET must be at least 32 characters"),
  REFRESH_SECRET: z.string().min(32, "REFRESH_SECRET must be at least 32 characters"),
  ACCESS_EXPIRES_IN: z.string().default("15m"),
  REFRESH_EXPIRES_IN: z.string().default("7d"),
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

export const isDevelopment = () => env.NODE_ENV === "development";
export const isProduction = () => env.NODE_ENV === "production";
export const isTest = () => env.NODE_ENV === "test";
