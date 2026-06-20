import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import * as svc from "../services/cart.service";

export async function getCart(req: Request, res: Response): Promise<void> {
  const data = await svc.getCart(req.user!.userId);
  sendResponse({ res, data });
}

export async function replaceCart(req: Request, res: Response): Promise<void> {
  const data = await svc.replaceCart(req.user!.userId, req.body.items);
  sendResponse({ res, data });
}
