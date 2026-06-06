import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import mongoose from "mongoose";

const mockConnect = vi.spyOn(mongoose, "connect");
const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as () => never);

// Speed up retries in tests
vi.mock("../../src/config/db", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../src/config/db")>();
  return mod;
});

// Override RETRY_DELAY_MS to 0 for fast tests
vi.stubEnv("NODE_ENV", "test");

describe("connectDB", () => {
  beforeEach(() => {
    mockConnect.mockReset();
    mockExit.mockClear();
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("connects and logs success on first attempt", async () => {
    mockConnect.mockResolvedValueOnce(mongoose);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { connectDB } = await import("../../src/config/db");
    await connectDB();

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith("MongoDB connected");
    consoleSpy.mockRestore();
  });

  it("throws if MONGODB_URI is not set", async () => {
    delete process.env.MONGODB_URI;
    const { connectDB } = await import("../../src/config/db");
    await expect(connectDB()).rejects.toThrow("MONGODB_URI is not set");
  });

  it("retries on failure and exits after max attempts", async () => {
    const err = new Error("connection refused");
    mockConnect.mockRejectedValue(err);
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Stub setTimeout to skip the 2-second delay
    vi.useFakeTimers();
    const { connectDB } = await import("../../src/config/db");

    const promise = connectDB();
    // Fast-forward through all retry delays
    for (let i = 0; i < 5; i++) {
      await vi.runAllTimersAsync();
    }
    await promise.catch(() => {});

    expect(mockConnect.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(mockExit).toHaveBeenCalledWith(1);
    vi.useRealTimers();
  });
});
