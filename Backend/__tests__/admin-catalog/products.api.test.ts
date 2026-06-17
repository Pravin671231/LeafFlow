import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";
import { adminToken, seedCategory, seedProduct } from "../helpers/seedCatalog";
import { Product } from "../../src/models/Product";
import { Category } from "../../src/models/Category";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(async () => {
  await Promise.all([Product.deleteMany({}), Category.deleteMany({})]);
});

const BASE = "/api/admin/products";

const validProductBody = (categoryId: string) => ({
  name: "Monstera Deliciosa",
  commonName: "Swiss Cheese Plant",
  categoryId,
  price: 599,
  lightRequirement: "indirect",
  waterSchedule: "weekly",
  humidity: "high",
  petFriendly: false,
});

// ── GET /api/admin/products ───────────────────────────────────────────────────

describe("GET /api/admin/products", () => {
  it("P1: no auth → 401", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it("P2: returns paginated list with total, page, limit", async () => {
    await seedProduct({ name: "Aloe Vera", slug: "aloe-vera" });

    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({ total: 1, page: 1, limit: 20 });
  });

  it("P3: ?categoryId filters by category", async () => {
    const cat1 = await seedCategory({ name: "Cat1", slug: "cat1" });
    const cat2 = await seedCategory({ name: "Cat2", slug: "cat2" });
    await seedProduct({ categoryId: cat1._id, slug: "p1" });
    await seedProduct({ categoryId: cat2._id, slug: "p2" });

    const res = await request(app)
      .get(`${BASE}?categoryId=${cat1._id}`)
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("p1");
  });

  it("P4: ?isActive=false returns only inactive products", async () => {
    await seedProduct({ slug: "active-p", isActive: true });
    await seedProduct({ slug: "inactive-p", isActive: false });

    const res = await request(app)
      .get(`${BASE}?isActive=false`)
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].isActive).toBe(false);
  });

  it("P5: ?q=monstera returns text-search matching products", async () => {
    await seedProduct({ name: "Monstera Deliciosa", slug: "monstera" });
    await seedProduct({ name: "Aloe Vera", slug: "aloe" });

    const res = await request(app)
      .get(`${BASE}?q=monstera`)
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("monstera");
  });

  it("P6: ?page=2&limit=2 returns correct offset", async () => {
    await seedProduct({ slug: "p1" });
    await seedProduct({ slug: "p2" });
    await seedProduct({ slug: "p3" });

    const res = await request(app)
      .get(`${BASE}?page=2&limit=2`)
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 2 });
    expect(res.body.data).toHaveLength(1);
  });
});

// ── POST /api/admin/products ──────────────────────────────────────────────────

describe("POST /api/admin/products", () => {
  it("P7: no auth → 401", async () => {
    const cat = await seedCategory();
    const res = await request(app).post(BASE).send(validProductBody(cat._id.toString()));
    expect(res.status).toBe(401);
  });

  it("P8: valid body → 201, slug auto-generated from name", async () => {
    const cat = await seedCategory();

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send(validProductBody(cat._id.toString()));

    expect(res.status).toBe(201);
    expect(res.body.data.product.slug).toBe("monstera-deliciosa");
    expect(res.body.data.product.name).toBe("Monstera Deliciosa");
  });

  it("P9: missing required field (price) → 400 VALIDATION_ERROR", async () => {
    const cat = await seedCategory();
    const body = { ...validProductBody(cat._id.toString()) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (body as any).price;

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("P10: invalid enum lightRequirement → 400 VALIDATION_ERROR", async () => {
    const cat = await seedCategory();

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ ...validProductBody(cat._id.toString()), lightRequirement: "invalid" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("P11: duplicate slug → 409 DUPLICATE_SLUG", async () => {
    const cat = await seedCategory();
    await seedProduct({ slug: "monstera-deliciosa", categoryId: cat._id });

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send(validProductBody(cat._id.toString()));

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("DUPLICATE_SLUG");
  });
});

// ── PATCH /api/admin/products/:id ─────────────────────────────────────────────

describe("PATCH /api/admin/products/:id", () => {
  it("P12: no auth → 401", async () => {
    const p = await seedProduct();
    const res = await request(app).patch(`${BASE}/${p._id}`).send({ stock: 50 });
    expect(res.status).toBe(401);
  });

  it("P13: { stock: 50 } → 200, only stock updated", async () => {
    const p = await seedProduct({ stock: 0, price: 299 });

    const res = await request(app)
      .patch(`${BASE}/${p._id}`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ stock: 50 });

    expect(res.status).toBe(200);
    expect(res.body.data.product.stock).toBe(50);
    expect(res.body.data.product.price).toBe(299);
  });

  it("P14: { name: 'New Name' } → 200, slug auto-updated", async () => {
    const p = await seedProduct({ name: "Old Name", slug: "old-name" });

    const res = await request(app)
      .patch(`${BASE}/${p._id}`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.data.product.name).toBe("New Name");
    expect(res.body.data.product.slug).toBe("new-name");
  });

  it("P15: unknown id → 404 NOT_FOUND", async () => {
    const res = await request(app)
      .patch(`${BASE}/000000000000000000000000`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ stock: 5 });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});

// ── DELETE /api/admin/products/:id ────────────────────────────────────────────

describe("DELETE /api/admin/products/:id", () => {
  it("P16: no auth → 401", async () => {
    const p = await seedProduct();
    const res = await request(app).delete(`${BASE}/${p._id}`);
    expect(res.status).toBe(401);
  });

  it("P17: valid id → 200, isActive: false, document still exists", async () => {
    const p = await seedProduct({ isActive: true });

    const res = await request(app)
      .delete(`${BASE}/${p._id}`)
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    const still = await Product.findById(p._id);
    expect(still).not.toBeNull();
    expect(still!.isActive).toBe(false);
  });

  it("P18: unknown id → 404 NOT_FOUND", async () => {
    const res = await request(app)
      .delete(`${BASE}/000000000000000000000000`)
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});
