import { describe, it, expect } from "vitest";
import { Category } from "../../src/models/Category";
import { Product } from "../../src/models/Product";
import { Types } from "mongoose";

const validCategoryData = () => ({
  name: "Succulents",
  slug: "succulents",
});

const validProductData = () => ({
  name: "Aloe Vera",
  commonName: "Aloe",
  slug: "aloe-vera",
  categoryId: new Types.ObjectId(),
  price: 299,
  lightRequirement: "indirect",
  waterSchedule: "weekly",
  humidity: "low",
  petFriendly: false,
});

// ── Category ─────────────────────────────────────────────────────────────────

describe("Category model", () => {
  it("accepts valid data", () => {
    const doc = new Category(validCategoryData());
    expect(doc.validateSync()).toBeUndefined();
  });

  it("rejects missing required fields", () => {
    const doc = new Category({});
    const err = doc.validateSync();
    expect(err?.errors["name"]).toBeDefined();
    expect(err?.errors["slug"]).toBeDefined();
  });

  it("defaults isActive to true", () => {
    const doc = new Category(validCategoryData());
    expect(doc.isActive).toBe(true);
  });

  it("allows optional description and imageUrl", () => {
    const doc = new Category({
      ...validCategoryData(),
      description: "Hardy desert plants",
      imageUrl: "https://cdn.example.com/succulents.jpg",
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.description).toBe("Hardy desert plants");
    expect(doc.imageUrl).toBe("https://cdn.example.com/succulents.jpg");
  });
});

// ── Product ───────────────────────────────────────────────────────────────────

describe("Product model", () => {
  it("accepts valid data", () => {
    const doc = new Product(validProductData());
    expect(doc.validateSync()).toBeUndefined();
  });

  it("rejects missing required fields", () => {
    const doc = new Product({});
    const err = doc.validateSync();
    expect(err?.errors["name"]).toBeDefined();
    expect(err?.errors["commonName"]).toBeDefined();
    expect(err?.errors["slug"]).toBeDefined();
    expect(err?.errors["categoryId"]).toBeDefined();
    expect(err?.errors["price"]).toBeDefined();
    expect(err?.errors["lightRequirement"]).toBeDefined();
    expect(err?.errors["waterSchedule"]).toBeDefined();
    expect(err?.errors["humidity"]).toBeDefined();
    expect(err?.errors["petFriendly"]).toBeDefined();
  });

  it("rejects invalid lightRequirement", () => {
    const doc = new Product({ ...validProductData(), lightRequirement: "invalid" });
    const err = doc.validateSync();
    expect(err?.errors["lightRequirement"]).toBeDefined();
  });

  it("accepts all valid lightRequirement values", () => {
    for (const val of ["low", "medium", "high", "indirect"] as const) {
      const doc = new Product({ ...validProductData(), lightRequirement: val });
      expect(doc.validateSync()).toBeUndefined();
    }
  });

  it("rejects invalid waterSchedule", () => {
    const doc = new Product({ ...validProductData(), waterSchedule: "monthly" });
    const err = doc.validateSync();
    expect(err?.errors["waterSchedule"]).toBeDefined();
  });

  it("accepts all valid waterSchedule values", () => {
    for (const val of ["daily", "every-2-days", "weekly", "bi-weekly"] as const) {
      const doc = new Product({ ...validProductData(), waterSchedule: val });
      expect(doc.validateSync()).toBeUndefined();
    }
  });

  it("rejects invalid humidity", () => {
    const doc = new Product({ ...validProductData(), humidity: "extreme" });
    const err = doc.validateSync();
    expect(err?.errors["humidity"]).toBeDefined();
  });

  it("accepts all valid humidity values", () => {
    for (const val of ["low", "medium", "high"] as const) {
      const doc = new Product({ ...validProductData(), humidity: val });
      expect(doc.validateSync()).toBeUndefined();
    }
  });

  it("defaults stock to 0", () => {
    const doc = new Product(validProductData());
    expect(doc.stock).toBe(0);
  });

  it("defaults lowStockThreshold to 5", () => {
    const doc = new Product(validProductData());
    expect(doc.lowStockThreshold).toBe(5);
  });

  it("defaults isActive to true", () => {
    const doc = new Product(validProductData());
    expect(doc.isActive).toBe(true);
  });

  it("defaults images to empty array", () => {
    const doc = new Product(validProductData());
    expect(doc.images).toEqual([]);
  });

  it("allows optional fields", () => {
    const doc = new Product({
      ...validProductData(),
      scientificName: "Aloe barbadensis",
      description: "A succulent plant",
      compareAtPrice: 399,
      potSize: "6 inch",
      heightRange: "30–40 cm",
      careInstructions: "Water once a week",
    });
    expect(doc.validateSync()).toBeUndefined();
  });
});
