import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";
import { adminToken, seedCategory, seedProduct } from "../helpers/seedCatalog";
import { Category } from "../../src/models/Category";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(async () => {
  const { Product } = await import("../../src/models/Product.js");
  await Promise.all([Category.deleteMany({}), Product.deleteMany({})]);
});

const BASE = "/api/admin/categories";

// ── GET /api/admin/categories ─────────────────────────────────────────────────

describe("GET /api/admin/categories", () => {
  it("C1: no auth → 401", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it("C2: returns all categories sorted by name (including inactive)", async () => {
    await seedCategory({ name: "Tropical", slug: "tropical", isActive: true });
    await seedCategory({ name: "Cacti", slug: "cacti", isActive: false });

    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.categories).toHaveLength(2);
    expect(res.body.data.categories[0].name).toBe("Cacti");
    expect(res.body.data.categories[1].name).toBe("Tropical");
  });

  it("C3: empty DB → returns []", async () => {
    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.categories).toEqual([]);
  });
});

// ── POST /api/admin/categories ────────────────────────────────────────────────

describe("POST /api/admin/categories", () => {
  it("C4: no auth → 401", async () => {
    const res = await request(app).post(BASE).send({ name: "Tropical Plants" });
    expect(res.status).toBe(401);
  });

  it("C5: valid name → 201 with auto-generated slug", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ name: "Tropical Plants" });

    expect(res.status).toBe(201);
    expect(res.body.data.category.slug).toBe("tropical-plants");
    expect(res.body.data.category.name).toBe("Tropical Plants");
  });

  it("C6: missing name → 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("C7: duplicate name → 409 DUPLICATE_SLUG", async () => {
    await seedCategory({ name: "Succulents", slug: "succulents" });

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ name: "Succulents" });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("DUPLICATE_SLUG");
  });
});

// ── PATCH /api/admin/categories/:id ──────────────────────────────────────────

describe("PATCH /api/admin/categories/:id", () => {
  it("C8: no auth → 401", async () => {
    const cat = await seedCategory();
    const res = await request(app).patch(`${BASE}/${cat._id}`).send({ name: "Updated" });
    expect(res.status).toBe(401);
  });

  it("C9: update name → 200, slug auto-updated", async () => {
    const cat = await seedCategory({ name: "Old Name", slug: "old-name" });

    const res = await request(app)
      .patch(`${BASE}/${cat._id}`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.data.category.name).toBe("New Name");
    expect(res.body.data.category.slug).toBe("new-name");
  });

  it("C10: update isActive → 200", async () => {
    const cat = await seedCategory();

    const res = await request(app)
      .patch(`${BASE}/${cat._id}`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.category.isActive).toBe(false);
  });

  it("C11: unknown id → 404 NOT_FOUND", async () => {
    const res = await request(app)
      .patch(`${BASE}/000000000000000000000000`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ name: "X" });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});

// ── DELETE /api/admin/categories/:id ─────────────────────────────────────────

describe("DELETE /api/admin/categories/:id", () => {
  it("C12: no auth → 401", async () => {
    const cat = await seedCategory();
    const res = await request(app).delete(`${BASE}/${cat._id}`);
    expect(res.status).toBe(401);
  });

  it("C13: category with products → 200, soft delete (isActive: false, document kept)", async () => {
    const cat = await seedCategory({ name: "Has Products", slug: "has-products" });
    await seedProduct({ categoryId: cat._id, slug: "test-product" });

    const res = await request(app)
      .delete(`${BASE}/${cat._id}`)
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    const still = await Category.findById(cat._id);
    expect(still).not.toBeNull();
    expect(still!.isActive).toBe(false);
  });

  it("C14: category with no products → 200, document hard deleted", async () => {
    const cat = await seedCategory({ name: "Empty Cat", slug: "empty-cat" });

    const res = await request(app)
      .delete(`${BASE}/${cat._id}`)
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    const gone = await Category.findById(cat._id);
    expect(gone).toBeNull();
  });

  it("C15: unknown id → 404 NOT_FOUND", async () => {
    const res = await request(app)
      .delete(`${BASE}/000000000000000000000000`)
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});
