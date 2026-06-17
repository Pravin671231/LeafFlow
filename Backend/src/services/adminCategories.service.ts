import slugify from "slugify";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { CreateCategoryBody, UpdateCategoryBody } from "../schemas/catalog.schema";
import { createLogger } from "../utils/logger";

const log = createLogger("adminCategories");

export async function listCategories() {
  return Category.find().sort({ name: 1 });
}

export async function createCategory(data: CreateCategoryBody) {
  const slug = slugify(data.name, { lower: true, strict: true });
  const existing = await Category.findOne({ slug });
  if (existing) throw new AppError(409, "DUPLICATE_SLUG", "A category with this name already exists");

  const category = await Category.create({ ...data, slug });
  log.info({ slug }, "Category created");
  return category;
}

export async function updateCategory(id: string, data: UpdateCategoryBody) {
  const category = await Category.findById(id);
  if (!category) throw new AppError(404, "NOT_FOUND", "Category not found");

  if (data.name && data.name !== category.name) {
    const slug = slugify(data.name, { lower: true, strict: true });
    const existing = await Category.findOne({ slug, _id: { $ne: id } });
    if (existing) throw new AppError(409, "DUPLICATE_SLUG", "A category with this name already exists");
    category.slug = slug;
  }

  Object.assign(category, data);
  await category.save();
  return category;
}

export async function deleteCategory(id: string) {
  const category = await Category.findById(id);
  if (!category) throw new AppError(404, "NOT_FOUND", "Category not found");

  const hasProducts = await Product.exists({ categoryId: id });
  if (hasProducts) {
    category.isActive = false;
    await category.save();
    log.info({ id }, "Category soft-deleted (products exist)");
    return { deleted: false };
  }

  await category.deleteOne();
  log.info({ id }, "Category hard-deleted");
  return { deleted: true };
}
