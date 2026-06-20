import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";
import { seedProduct } from "../helpers/seedCatalog";
import { Cart } from "../../src/models/Cart";
import { User } from "../../src/models/User";
import { Product } from "../../src/models/Product";
import { Category } from "../../src/models/Category";
import { generateAccessToken } from "../../src/services/token.service";

async function clearCollections() {
  await Promise.all([
    Cart.deleteMany({}),
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
  ]);
}

async function seedBuyer() {
  return User.create({ email: "buyer@test.com", isVerified: true });
}

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearCollections);

const BASE = "/api/buyer/cart";

// ── GET /api/buyer/cart ───────────────────────────────────────────────────────

describe("GET /api/buyer/cart", () => {
  it("C1: no JWT → 401 UNAUTHORIZED", async () => {
    const res = await request(app).get(BASE);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  it("C2: buyer with no cart → 200 with empty items", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });

    const res = await request(app).get(BASE).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ items: [] });
  });
});

// ── PUT /api/buyer/cart ───────────────────────────────────────────────────────

describe("PUT /api/buyer/cart", () => {
  it("C3: no JWT → 401 UNAUTHORIZED", async () => {
    const res = await request(app).put(BASE).send({ items: [] });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  it("C4: PUT with empty items clears the cart", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });
    const product = await seedProduct({ stock: 10 });

    // seed a cart first
    await Cart.create({
      userId: user._id,
      items: [{ productId: product._id, quantity: 2 }],
    });

    const putRes = await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [] });

    expect(putRes.status).toBe(200);

    const getRes = await request(app).get(BASE).set("Authorization", `Bearer ${token}`);
    expect(getRes.body.data.items).toHaveLength(0);
  });

  it("C5: PUT with valid item → 200, returns populated cart", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });
    const product = await seedProduct({ stock: 10, price: 299 });

    const res = await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: product._id.toString(), quantity: 2 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]).toMatchObject({ quantity: 2 });
    expect(res.body.data.items[0].productId).toMatchObject({ name: product.name });
  });

  it("C6: PUT with quantity > stock → 422 STOCK_EXCEEDED naming the product", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });
    const product = await seedProduct({ stock: 3, name: "Fern Plant" });

    const res = await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: product._id.toString(), quantity: 10 }],
      });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ success: false, code: "STOCK_EXCEEDED" });
    expect(res.body.message).toContain("Fern Plant");
  });

  it("C7: PUT with non-existent productId → 422 PRODUCT_NOT_FOUND", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });

    const res = await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: "000000000000000000000000", quantity: 1 }],
      });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ success: false, code: "PRODUCT_NOT_FOUND" });
  });
});

// ── GET after PUT ─────────────────────────────────────────────────────────────

describe("GET after PUT", () => {
  it("C8: GET after successful PUT returns updated populated items", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });
    const product = await seedProduct({ stock: 5, price: 499 });

    await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: product._id.toString(), quantity: 3 }],
      });

    const res = await request(app).get(BASE).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    const item = res.body.data.items[0];
    expect(item.quantity).toBe(3);
    expect(item.productId).toMatchObject({
      name: product.name,
      price: 499,
      slug: product.slug,
    });
    expect(item.productId).toHaveProperty("stock");
    expect(item.productId).toHaveProperty("images");
  });
});
