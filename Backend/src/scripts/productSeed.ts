/* eslint-disable no-console */
import dotenv from "dotenv";
dotenv.config();

import slugify from "slugify";
import { connectDB, disconnectDB } from "../config/db.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";

if (process.env.NODE_ENV === "production") {
  console.error("Seed scripts cannot run in production");
  process.exit(1);
}

async function seed(): Promise<void> {
  await connectDB();

  try {
    const categories = await Category.find({});
    if (categories.length === 0) {
      console.error("No categories found. Run `npm run seed:categories` first.");
      await disconnectDB();
      process.exit(1);
    }

    const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c._id]));

    const PRODUCTS = [
      {
        name: "Aloe Vera",
        commonName: "Aloe",
        scientificName: "Aloe barbadensis",
        categorySlug: "succulents",
        price: 199,
        stock: 30,
        lightRequirement: "indirect" as const,
        waterSchedule: "weekly" as const,
        humidity: "low" as const,
        petFriendly: false,
        potSize: "4 inch",
        heightRange: "15–30 cm",
        careInstructions: "Water once a week. Allow soil to dry out between waterings.",
      },
      {
        name: "Monstera Deliciosa",
        commonName: "Swiss Cheese Plant",
        scientificName: "Monstera deliciosa",
        categorySlug: "tropical-plants",
        price: 599,
        stock: 12,
        lightRequirement: "indirect" as const,
        waterSchedule: "weekly" as const,
        humidity: "high" as const,
        petFriendly: false,
        potSize: "6 inch",
        heightRange: "30–60 cm",
        careInstructions: "Keep in bright indirect light. Water weekly and mist leaves.",
      },
      {
        name: "Bird's Nest Fern",
        commonName: "Bird's Nest Fern",
        scientificName: "Asplenium nidus",
        categorySlug: "ferns",
        price: 349,
        stock: 20,
        lightRequirement: "low" as const,
        waterSchedule: "every-2-days" as const,
        humidity: "high" as const,
        petFriendly: true,
        potSize: "5 inch",
        heightRange: "20–40 cm",
        careInstructions: "Keep soil consistently moist. Avoid direct sunlight.",
      },
      {
        name: "Golden Barrel Cactus",
        commonName: "Golden Barrel",
        scientificName: "Echinocactus grusonii",
        categorySlug: "cacti",
        price: 249,
        stock: 25,
        lightRequirement: "high" as const,
        waterSchedule: "bi-weekly" as const,
        humidity: "low" as const,
        petFriendly: false,
        potSize: "4 inch",
        heightRange: "10–20 cm",
        careInstructions: "Place in full sun. Water only once every two weeks.",
      },
      {
        name: "Peace Lily",
        commonName: "Peace Lily",
        scientificName: "Spathiphyllum wallisii",
        categorySlug: "tropical-plants",
        price: 299,
        stock: 18,
        lightRequirement: "low" as const,
        waterSchedule: "weekly" as const,
        humidity: "medium" as const,
        petFriendly: false,
        potSize: "5 inch",
        heightRange: "30–50 cm",
        careInstructions: "Thrives in low light. Water when top inch of soil is dry.",
      },
      {
        name: "Marigold",
        commonName: "Marigold",
        scientificName: "Tagetes erecta",
        categorySlug: "flowering-plants",
        price: 99,
        stock: 50,
        lightRequirement: "high" as const,
        waterSchedule: "daily" as const,
        humidity: "low" as const,
        petFriendly: true,
        potSize: "4 inch",
        heightRange: "20–30 cm",
        careInstructions: "Needs full sun. Water daily and deadhead spent blooms.",
      },
    ];

    const deleted = await Product.deleteMany({});
    if (deleted.deletedCount > 0) {
      console.log(`Deleted ${deleted.deletedCount} existing product(s)`);
    }

    for (const item of PRODUCTS) {
      const categoryId = bySlug[item.categorySlug];
      if (!categoryId) {
        console.warn(`  ⚠ Category "${item.categorySlug}" not found — skipping ${item.name}`);
        continue;
      }

      const { categorySlug, ...rest } = item;
      const slug = slugify(item.name, { lower: true, strict: true });

      await Product.create({ ...rest, slug, categoryId, isActive: true });
      console.log(`Seeded product: ${item.name} (${slug}) → ${categorySlug}`);
    }

    console.log(`\n✓ Products seeded successfully`);
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error("Product seed failed:", error);
    await disconnectDB();
    process.exit(1);
  }
}

seed();
