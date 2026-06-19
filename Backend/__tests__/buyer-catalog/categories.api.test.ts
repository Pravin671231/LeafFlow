import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";
import { seedCategory } from "../helpers/seedCatalog";
import { Category } from "../../src/models/Category";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(async () => {
  await Category.deleteMany({});
});

const BASE = "/api/categories";

// ── GET /api/categories ───────────────────────────────────────────────────────

describe("GET /api/categories", () => {
  it("BC1: returns only active categories", async () => {
    await seedCategory({ name: "Ferns", slug: "ferns", isActive: true });
    await seedCategory({ name: "Hidden", slug: "hidden", isActive: false });

    const res = await request(app).get(BASE);

    expect(res.status).toBe(200);
    expect(res.body.data.categories).toHaveLength(1);
    expect(res.body.data.categories[0].slug).toBe("ferns");
  });

  it("BC2: inactive categories are excluded", async () => {
    await seedCategory({ name: "Active", slug: "active", isActive: true });
    await seedCategory({ name: "Inactive", slug: "inactive", isActive: false });

    const res = await request(app).get(BASE);

    const slugs = res.body.data.categories.map((c: { slug: string }) => c.slug);
    expect(slugs).not.toContain("inactive");
  });

  it("BC3: results are sorted by name A→Z", async () => {
    await seedCategory({ name: "Succulents", slug: "succulents" });
    await seedCategory({ name: "Ferns", slug: "ferns" });
    await seedCategory({ name: "Orchids", slug: "orchids" });

    const res = await request(app).get(BASE);

    const names = res.body.data.categories.map((c: { name: string }) => c.name);
    expect(names).toEqual(["Ferns", "Orchids", "Succulents"]);
  });
});
