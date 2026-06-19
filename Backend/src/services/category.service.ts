import { Category } from "../models/Category";

export async function listCategories() {
  return Category.find({ isActive: true }).sort({ name: 1 });
}
