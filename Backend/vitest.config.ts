import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, ".env") });

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    setupFiles: ["./__tests__/setup/testKeys.ts"],
    env: {
      CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3001,http://localhost:5173",
    },
    coverage: {
      provider: "v8",
    },
  },
});
