import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import * as svc from "../services/order.service";

export async function createOrder(req: Request, res: Response): Promise<void> {
  const data = await svc.createOrder(req.user!.userId, req.body.shippingAddress);
  sendResponse({ res, statusCode: 201, data, message: "Order created" });
}
