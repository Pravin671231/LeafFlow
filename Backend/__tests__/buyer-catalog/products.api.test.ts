import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";
import { seedCategory, seedProduct } from "../helpers/seedCatalog";
import { Product } from "../../src/models/Product";
import { Category } from "../../src/models/Category";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(async () => {
  await Promise.all([Product.deleteMany({}), Category.deleteMany({})]);
});

const BASE = "/api/products";

// ── GET /api/products ─────────────────────────────────────────────────────────

describe("GET /api/products", () => {
  it("BP1: returns only active products", async () => {
    await seedProduct({ slug: "active-p", isActive: true });
    await seedProduct({ slug: "inactive-p", isActive: false });

    const res = await request(app).get(BASE);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("active-p");
  });

  it("BP2: ?category=<slug> filters by category slug", async () => {
    const cat1 = await seedCategory({ name: "Ferns", slug: "ferns" });
    const cat2 = await seedCategory({ name: "Succulents", slug: "succulents" });
    await seedProduct({ categoryId: cat1._id, slug: "fern-1" });
    await seedProduct({ categoryId: cat2._id, slug: "succulent-1" });

    const res = await request(app).get(`${BASE}?category=ferns`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("fern-1");
  });

  it("BP3: ?minPrice=300&maxPrice=600 filters by price range", async () => {
    await seedProduct({ slug: "cheap", price: 199 });
    await seedProduct({ slug: "mid", price: 499 });
    await seedProduct({ slug: "expensive", price: 999 });

    const res = await request(app).get(`${BASE}?minPrice=300&maxPrice=600`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("mid");
  });

  it("BP4: ?light=low filters by lightRequirement", async () => {
    await seedProduct({ slug: "low-light", lightRequirement: "low" });
    await seedProduct({ slug: "indirect-light", lightRequirement: "indirect" });

    const res = await request(app).get(`${BASE}?light=low`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("low-light");
  });

  it("BP5: ?inStock=true returns only products with stock > 0", async () => {
    await seedProduct({ slug: "in-stock", stock: 10 });
    await seedProduct({ slug: "out-of-stock", stock: 0 });

    const res = await request(app).get(`${BASE}?inStock=true`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("in-stock");
  });

  it("BP6: ?q=monstera returns text-search matching products", async () => {
    await seedProduct({ name: "Monstera Deliciosa", slug: "monstera" });
    await seedProduct({ name: "Aloe Vera", slug: "aloe" });

    const res = await request(app).get(`${BASE}?q=monstera`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("monstera");
  });

  it("BP7: ?page=2&limit=2 returns correct window with total", async () => {
    await seedProduct({ slug: "p1" });
    await seedProduct({ slug: "p2" });
    await seedProduct({ slug: "p3" });

    const res = await request(app).get(`${BASE}?page=2&limit=2`);

    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 2, total: 3 });
    expect(res.body.data).toHaveLength(1);
  });
});

// ── GET /api/products/:slug ───────────────────────────────────────────────────

describe("GET /api/products/:slug", () => {
  it("BP8: active product → 200 with full product data", async () => {
    await seedProduct({ name: "Monstera", slug: "monstera", isActive: true });

    const res = await request(app).get(`${BASE}/monstera`);

    expect(res.status).toBe(200);
    expect(res.body.data.product.slug).toBe("monstera");
  });

  it("BP9: inactive product → 404 NOT_FOUND", async () => {
    await seedProduct({ slug: "hidden-plant", isActive: false });

    const res = await request(app).get(`${BASE}/hidden-plant`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });

  it("BP10: unknown slug → 404 NOT_FOUND", async () => {
    const res = await request(app).get(`${BASE}/does-not-exist`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});
