import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { connectTestDb, disconnectTestDb } from "../helpers/seedAdmin";
import { adminToken, seedProduct } from "../helpers/seedCatalog";
import { Cart } from "../../src/models/Cart";
import { Order } from "../../src/models/Order";
import { User, IUser } from "../../src/models/User";
import { Product } from "../../src/models/Product";
import { Category } from "../../src/models/Category";
import { generateAccessToken } from "../../src/services/token.service";

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

async function seedBuyer() {
  return User.create({ email: "buyer@test.com", isVerified: true });
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
