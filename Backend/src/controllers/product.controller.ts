import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../utils/sendResponse";

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    // TODO: call product service
    sendResponse({ res, data: { products: [], total: 0 } });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    // TODO: call product service
    sendResponse({ res, data: { product: null } });
  } catch (err) {
    next(err);
  }
}
