import "./config/env";
import "dotenv/config";
import mongoose from "mongoose";
import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { createLogger } from "./utils/logger";

const log = createLogger("server");

async function startServer(): Promise<void> {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    log.info({ port: env.PORT }, "Server started");
  });

  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, "Shutdown signal received");
    server.close(async () => {
      await mongoose.disconnect();
      log.info("Server shut down gracefully");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err) => {
  log.error({ err }, "Failed to start server");
  process.exit(1);
});
