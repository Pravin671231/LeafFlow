import request from "supertest";
import app from "../src/app.js";
import { describe, it, expect } from "vitest";

const ALLOWED = "http://localhost:3001";
const BLOCKED = "https://evil.com";

describe("CORS middleware", () => {
  it("returns Access-Control-Allow-Origin for an allowed origin", async () => {
    const res = await request(app).get("/health").set("Origin", ALLOWED);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED);
  });

  it("does NOT return Access-Control-Allow-Origin for a blocked origin", async () => {
    const res = await request(app).get("/health").set("Origin", BLOCKED);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("returns 200 with correct headers for OPTIONS preflight from allowed origin", async () => {
    const res = await request(app)
      .options("/health")
      .set("Origin", ALLOWED)
      .set("Access-Control-Request-Method", "GET");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED);
    expect(res.headers["access-control-allow-methods"]).toBeDefined();
  });

  it("includes Access-Control-Allow-Credentials for allowed origin", async () => {
    const res = await request(app).get("/health").set("Origin", ALLOWED);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });
});
