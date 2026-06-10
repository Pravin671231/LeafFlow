import mongoose from "mongoose";
import { env } from "./env";
import { createLogger } from "../utils/logger";

const log = createLogger("db");

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;

export async function connectDB(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI);
      log.info("MongoDB connected");
      return;
    } catch (err) {
      log.error({ err, attempt, maxAttempts: MAX_ATTEMPTS }, "MongoDB connection attempt failed");
      if (attempt === MAX_ATTEMPTS) {
        throw new Error("MongoDB connection failed after maximum attempts");
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
