import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";
import { adminToken, seedProduct } from "../helpers/seedCatalog";
import { Cart } from "../../src/models/Cart";
import { Order } from "../../src/models/Order";
import { User } from "../../src/models/User";
import { Product } from "../../src/models/Product";
import { Category } from "../../src/models/Category";
import { generateAccessToken } from "../../src/services/token.service";
import { Types } from "mongoose";

vi.mock("../../src/services/integrations/razorpay.service", () => ({
  razorpay: {
    orders: {
      create: vi.fn().mockResolvedValue({
        id: "order_test123",
        amount: 0,
        currency: "INR",
      }),
    },
  },
}));

async function clearCollections() {
  await Promise.all([
    Cart.deleteMany({}),
    Order.deleteMany({}),
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
  ]);
}

async function seedBuyer(email = "buyer@test.com") {
  return User.create({ email, isVerified: true });
}

async function seedOrder(userId: Types.ObjectId, overrides = {}) {
  return Order.create({
    userId,
    items: [{ productId: new Types.ObjectId(), name: "Test Plant", quantity: 1, priceAtOrder: 299 }],
    shippingAddress: {
      fullName: "Jane Doe",
      phone: "9876543210",
      line1: "12 Green Lane",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600001",
    },
    subtotal: 299,
    shippingFee: 0,
    total: 299,
    razorpayOrderId: `order_${new Types.ObjectId().toString()}`,
    paymentStatus: "pending",
    status: "pending",
    ...overrides,
  });
}

const validAddress = {
  fullName: "Jane Doe",
  phone: "9876543210",
  line1: "12 Green Lane",
  city: "Chennai",
  state: "Tamil Nadu",
  pincode: "600001",
};

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearCollections);

const BASE = "/api/buyer/orders";

// ── POST /api/buyer/orders ────────────────────────────────────────────────────

describe("POST /api/buyer/orders", () => {
  it("O1: no JWT → 401 UNAUTHORIZED", async () => {
    const res = await request(app).post(BASE).send({ shippingAddress: validAddress });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  it("O2: admin token → 403 FORBIDDEN", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ shippingAddress: validAddress });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, code: "FORBIDDEN" });
  });

  it("O3: missing shippingAddress → 400 VALIDATION_ERROR", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });

    const res = await request(app).post(BASE).set("Authorization", `Bearer ${token}`).send({});

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
  });

  it("O4: empty cart → 422 CART_EMPTY", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddress: validAddress });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ success: false, code: "CART_EMPTY" });
  });

  it("O5: out-of-stock item → 422 OUT_OF_STOCK naming the product", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });
    const product = await seedProduct({ stock: 0, name: "Cactus Plant" });

    await Cart.create({ userId: user._id, items: [{ productId: product._id, quantity: 1 }] });

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddress: validAddress });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ success: false, code: "OUT_OF_STOCK" });
    expect(res.body.message).toContain("Cactus Plant");
  });

  it("O6: happy path → 201 with orderId, razorpayOrderId, amount, currency", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });
    const product = await seedProduct({ stock: 10, price: 500 });

    await Cart.create({ userId: user._id, items: [{ productId: product._id, quantity: 2 }] });

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddress: validAddress });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      razorpayOrderId: "order_test123",
      currency: "INR",
    });
    expect(res.body.data).toHaveProperty("orderId");
    expect(res.body.data).toHaveProperty("amount");
  });

  it("O7: stock is decremented after order creation", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });
    const product = await seedProduct({ stock: 10, price: 300 });

    await Cart.create({ userId: user._id, items: [{ productId: product._id, quantity: 3 }] });

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ shippingAddress: validAddress });

    const updated = await Product.findById(product._id);
    expect(updated!.stock).toBe(7);
  });
});

// ── GET /api/buyer/orders ─────────────────────────────────────────────────────

describe("GET /api/buyer/orders", () => {
  it("O8: no JWT → 401 UNAUTHORIZED", async () => {
    const res = await request(app).get(BASE);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  it("O9: no orders → 200 with empty data array", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });

    const res = await request(app).get(BASE).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination).toMatchObject({ page: 1, total: 0 });
  });

  it("O10: returns only the authenticated buyer's orders", async () => {
    const buyer1 = await seedBuyer("buyer1@test.com");
    const buyer2 = await seedBuyer("buyer2@test.com");
    const token = generateAccessToken({ id: buyer1._id.toString(), role: "buyer" });

    await seedOrder(buyer1._id);
    await seedOrder(buyer1._id);
    await seedOrder(buyer2._id);

    const res = await request(app).get(BASE).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ page: 1, total: 2 });
  });

  it("O11: orders are sorted newest first", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });

    const first = await seedOrder(user._id);
    await new Promise((r) => setTimeout(r, 10));
    const second = await seedOrder(user._id);

    const res = await request(app).get(BASE).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0]._id).toBe(second._id.toString());
    expect(res.body.data[1]._id).toBe(first._id.toString());
  });

  it("O12: pagination — page and limit query params work", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });

    await seedOrder(user._id);
    await seedOrder(user._id);
    await seedOrder(user._id);

    const res = await request(app)
      .get(`${BASE}?page=2&limit=2`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 2, total: 3 });
  });
});

// ── GET /api/buyer/orders/:id ─────────────────────────────────────────────────

describe("GET /api/buyer/orders/:id", () => {
  it("O13: no JWT → 401 UNAUTHORIZED", async () => {
    const res = await request(app).get(`${BASE}/${new Types.ObjectId()}`);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  it("O14: valid order belonging to buyer → 200 with order data", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });
    const order = await seedOrder(user._id);

    const res = await request(app)
      .get(`${BASE}/${order._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(order._id.toString());
    expect(res.body.data.paymentStatus).toBe("pending");
  });

  it("O15: order belonging to another buyer → 404 ORDER_NOT_FOUND", async () => {
    const buyer1 = await seedBuyer("buyer1@test.com");
    const buyer2 = await seedBuyer("buyer2@test.com");
    const token = generateAccessToken({ id: buyer1._id.toString(), role: "buyer" });
    const order = await seedOrder(buyer2._id);

    const res = await request(app)
      .get(`${BASE}/${order._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, code: "ORDER_NOT_FOUND" });
  });

  it("O16: non-existent orderId → 404 ORDER_NOT_FOUND", async () => {
    const user = await seedBuyer();
    const token = generateAccessToken({ id: user._id.toString(), role: "buyer" });

    const res = await request(app)
      .get(`${BASE}/${new Types.ObjectId()}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, code: "ORDER_NOT_FOUND" });
  });
});
