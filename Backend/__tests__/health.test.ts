import request from "supertest";
import app from "../src/app";
import { describe, it, expect } from "vitest";

describe("GET /health", () => {
  it("should return ok status", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
