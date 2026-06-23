import { Cart } from "../models/Cart";
import { Product } from "../models/Product";
import { Order, IShippingAddress } from "../models/Order";
import { razorpay } from "./integrations/razorpay.service";
import { AppError } from "../utils/AppError";
import { IProduct } from "../models/Product";

export async function createOrder(userId: string, shippingAddress: IShippingAddress) {
  const cart = await Cart.findOne({ userId }).populate("items.productId", "name price stock");

  if (!cart || cart.items.length === 0) {
    throw new AppError(422, "CART_EMPTY", "Cart is empty");
  }

  let subtotal = 0;
  const items = [];

  for (const item of cart.items) {
    const product = item.productId as unknown as IProduct;
    if (product.stock < item.quantity) {
      throw new AppError(422, "OUT_OF_STOCK", `'${product.name}' is out of stock`);
    }
    items.push({
      productId: product._id,
      name: product.name,
      quantity: item.quantity,
      priceAtOrder: product.price,
    });
    subtotal += product.price * item.quantity;
  }

  const shippingFee = 0;
  const total = subtotal + shippingFee;

  const rzpOrder = await razorpay.orders.create({
    amount: total * 100,
    currency: "INR",
    receipt: `rcpt_${Date.now()}`,
  });

  for (const item of items) {
    await Product.updateOne({ _id: item.productId }, { $inc: { stock: -item.quantity } });
  }

  const order = await Order.create({
    userId,
    items,
    shippingAddress,
    subtotal,
    shippingFee,
    total,
    razorpayOrderId: rzpOrder.id,
    paymentStatus: "pending",
    status: "pending",
  });

  return {
    orderId: order._id,
    razorpayOrderId: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
  };
}
