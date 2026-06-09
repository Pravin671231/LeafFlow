import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

const mockConnect = vi.spyOn(mongoose, "connect");

// Speed up retries in tests
vi.stubEnv("NODE_ENV", "test");

describe("connectDB", () => {
  beforeEach(() => {
    mockConnect.mockReset();
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
  });

  it("connects on first attempt", async () => {
    mockConnect.mockResolvedValueOnce(mongoose);

    const { connectDB } = await import("../../src/config/db");
    await connectDB();

    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and throws after max attempts", async () => {
    const err = new Error("connection refused");
    mockConnect.mockRejectedValue(err);

    vi.useFakeTimers();
    const { connectDB } = await import("../../src/config/db");

    const promise = connectDB();
    promise.catch(() => {}); // prevent unhandled rejection warning during timer advance
    for (let i = 0; i < 5; i++) {
      await vi.runAllTimersAsync();
    }

    await expect(promise).rejects.toThrow("MongoDB connection failed after maximum attempts");
    expect(mockConnect.mock.calls.length).toBeGreaterThanOrEqual(5);
    vi.useRealTimers();
  });
});
