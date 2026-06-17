import slugify from "slugify";
import { Types } from "mongoose";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { parsePagination } from "../utils/pagination";
import { CreateProductBody, UpdateProductBody } from "../schemas/product.schema";
import { createLogger } from "../utils/logger";

const log = createLogger("adminProducts");

export interface ListProductsQuery {
  page?: unknown;
  limit?: unknown;
  categoryId?: string;
  isActive?: boolean;
  q?: string;
}

export async function listProducts(query: ListProductsQuery) {
  const { page, limit, skip } = parsePagination(query);

  const filter: Record<string, unknown> = {};
  if (query.categoryId) filter.categoryId = new Types.ObjectId(query.categoryId);
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.q) filter.$text = { $search: query.q };

  const [products, total] = await Promise.all([
    Product.find(filter).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  return { products, total, page, limit };
}

export async function createProduct(data: CreateProductBody) {
  const slug = data.slug ?? slugify(data.name, { lower: true, strict: true });
  const existing = await Product.findOne({ slug });
  if (existing) throw new AppError(409, "DUPLICATE_SLUG", "A product with this slug already exists");

  const product = await Product.create({ ...data, slug, categoryId: new Types.ObjectId(data.categoryId) });
  log.info({ slug }, "Product created");
  return product;
}

export async function updateProduct(id: string, data: UpdateProductBody) {
  const product = await Product.findById(id);
  if (!product) throw new AppError(404, "NOT_FOUND", "Product not found");

  if (data.name && data.name !== product.name) {
    const slug = slugify(data.name, { lower: true, strict: true });
    const existing = await Product.findOne({ slug, _id: { $ne: id } });
    if (existing) throw new AppError(409, "DUPLICATE_SLUG", "A product with this slug already exists");
    product.slug = slug;
  }

  if (data.categoryId) {
    (data as Record<string, unknown>).categoryId = new Types.ObjectId(data.categoryId);
  }

  Object.assign(product, data);
  await product.save();
  return product;
}

export async function deleteProduct(id: string) {
  const product = await Product.findById(id);
  if (!product) throw new AppError(404, "NOT_FOUND", "Product not found");

  product.isActive = false;
  await product.save();
  log.info({ id }, "Product soft-deleted");
}
