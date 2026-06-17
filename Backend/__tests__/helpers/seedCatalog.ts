import { Types } from "mongoose";
import { Category } from "../../src/models/Category.js";
import { Product } from "../../src/models/Product.js";
import { signAccessToken } from "../../src/services/token.service.js";

let counter = 0;
const uid = () => `${Date.now()}-${++counter}`;

export function adminToken() {
  return signAccessToken({ adminId: new Types.ObjectId().toString(), role: "admin" });
}

export async function seedCategory(overrides: Record<string, unknown> = {}) {
  const id = uid();
  return Category.create({
    name: `Category ${id}`,
    slug: `category-${id}`,
    isActive: true,
    ...overrides,
  });
}

export async function seedProduct(overrides: Record<string, unknown> = {}) {
  const id = uid();
  const category = overrides.categoryId
    ? { _id: overrides.categoryId }
    : await seedCategory();

  return Product.create({
    name: `Product ${id}`,
    commonName: `Common ${id}`,
    slug: `product-${id}`,
    categoryId: category._id,
    price: 299,
    lightRequirement: "indirect",
    waterSchedule: "weekly",
    humidity: "low",
    petFriendly: false,
    isActive: true,
    ...overrides,
  });
}
