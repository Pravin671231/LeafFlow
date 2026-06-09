import "./config/env";
import "dotenv/config";
import mongoose from "mongoose";
import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { logger } from "./utils/logger";

async function startServer(): Promise<void> {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Server started");
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutdown signal received");
    server.close(async () => {
      await mongoose.disconnect();
      logger.info("Server shut down gracefully");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
