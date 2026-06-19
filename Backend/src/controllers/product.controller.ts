import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../utils/sendResponse";
import * as svc from "../services/product.service";

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { products, total, page, limit } = await svc.listProducts(req.query);
    sendResponse({ res, data: products, pagination: { page, limit, total } });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await svc.getProductBySlug(req.params.slug as string);
    sendResponse({ res, data: { product } });
  } catch (err) {
    next(err);
  }
}
