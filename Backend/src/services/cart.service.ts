import { Cart } from "../models/Cart";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { CartReplaceBody } from "../schemas/cart.schema";

const PRODUCT_POPULATE = "name price stock images slug";

export async function getCart(userId: string) {
  const cart = await Cart.findOne({ userId }).populate("items.productId", PRODUCT_POPULATE);
  if (!cart) return { items: [] };
  return cart;
}

export async function replaceCart(userId: string, items: CartReplaceBody["items"]) {
  for (const item of items) {
    const product = await Product.findById(item.productId, "name stock");
    if (!product) {
      throw new AppError(422, "PRODUCT_NOT_FOUND", `Product '${item.productId}' not found`);
    }
    if (item.quantity > product.stock) {
      throw new AppError(
        422,
        "STOCK_EXCEEDED",
        `Only ${product.stock} unit(s) of '${product.name}' available`
      );
    }
  }

  const cart = await Cart.findOneAndUpdate(
    { userId },
    { userId, items },
    { upsert: true, returnDocument: "after" }
  ).populate("items.productId", PRODUCT_POPULATE);

  return cart;
}
