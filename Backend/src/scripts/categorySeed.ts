/* eslint-disable no-console */
import dotenv from "dotenv";
dotenv.config();

import slugify from "slugify";
import { connectDB, disconnectDB } from "../config/db.js";
import { Category } from "../models/Category.js";

if (process.env.NODE_ENV === "production") {
  console.error("Seed scripts cannot run in production");
  process.exit(1);
}

const CATEGORIES = [
  { name: "Succulents", description: "Hardy, water-storing plants that thrive in dry conditions" },
  { name: "Tropical Plants", description: "Lush foliage plants native to tropical climates" },
  { name: "Ferns", description: "Shade-loving plants with delicate, feathery fronds" },
  { name: "Cacti", description: "Desert plants adapted to arid environments" },
  { name: "Flowering Plants", description: "Plants grown primarily for their blooms and colour" },
];

async function seed(): Promise<void> {
  await connectDB();

  try {
    const deleted = await Category.deleteMany({});
    if (deleted.deletedCount > 0) {
      console.log(`Deleted ${deleted.deletedCount} existing category/categories`);
    }

    for (const item of CATEGORIES) {
      const slug = slugify(item.name, { lower: true, strict: true });
      await Category.create({ name: item.name, slug, description: item.description, isActive: true });
      console.log(`Seeded category: ${item.name} (${slug})`);
    }

    console.log(`\n✓ ${CATEGORIES.length} categories seeded successfully`);
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error("Category seed failed:", error);
    await disconnectDB();
    process.exit(1);
  }
}

seed();
