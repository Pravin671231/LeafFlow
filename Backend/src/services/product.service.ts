import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { parsePagination } from "../utils/pagination";

export interface ListProductsQuery {
  page?: unknown;
  limit?: unknown;
  category?: unknown;
  minPrice?: unknown;
  maxPrice?: unknown;
  light?: unknown;
  inStock?: unknown;
  q?: unknown;
}

export async function listProducts(query: ListProductsQuery) {
  const { page, limit, skip } = parsePagination(query);

  const filter: Record<string, unknown> = { isActive: true };

  if (query.category) {
    const cat = await Category.findOne({ slug: query.category as string, isActive: true });
    if (!cat) throw new AppError(404, "NOT_FOUND", "Category not found");
    filter.categoryId = cat._id;
  }

  const priceFilter: Record<string, number> = {};
  if (query.minPrice) priceFilter.$gte = Number(query.minPrice);
  if (query.maxPrice) priceFilter.$lte = Number(query.maxPrice);
  if (Object.keys(priceFilter).length) filter.price = priceFilter;

  if (query.light) filter.lightRequirement = query.light as string;
  if (query.inStock === "true") filter.stock = { $gt: 0 };
  if (query.q) filter.$text = { $search: query.q as string };

  const [products, total] = await Promise.all([
    Product.find(filter).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  return { products, total, page, limit };
}

export async function getProductBySlug(slug: string) {
  const product = await Product.findOne({ slug, isActive: true });
  if (!product) throw new AppError(404, "NOT_FOUND", "Product not found");
  return product;
}
