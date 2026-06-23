import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import * as svc from "../services/order.service";

export async function createOrder(req: Request, res: Response): Promise<void> {
  const data = await svc.createOrder(req.user!.userId, req.body.shippingAddress);
  sendResponse({ res, statusCode: 201, data, message: "Order created" });
}

export async function listOrders(req: Request, res: Response): Promise<void> {
  const { orders, total, page, limit } = await svc.listOrders(req.user!.userId, req.query);
  sendResponse({ res, data: orders, pagination: { page, limit, total } });
}

export async function getOrderById(req: Request, res: Response): Promise<void> {
  const order = await svc.getOrderById(req.user!.userId, String(req.params.id));
  sendResponse({ res, data: order });
}
