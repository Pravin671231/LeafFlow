import { Request, Response, NextFunction } from "express";
import * as svc from "../services/adminProducts.service";
import { sendResponse } from "../utils/sendResponse";
import { CreateProductBody, UpdateProductBody } from "../schemas/product.schema";

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { products, total, page, limit } = await svc.listProducts(req.query);
    sendResponse({ res, data: products, pagination: { page, limit, total } });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await svc.createProduct(req.body as CreateProductBody);
    sendResponse({ res, statusCode: 201, data: { product }, message: "Product created" });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await svc.updateProduct(req.params.id as string, req.body as UpdateProductBody);
    sendResponse({ res, data: { product }, message: "Product updated" });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteProduct(req.params.id as string);
    sendResponse({ res, message: "Product deactivated" });
  } catch (err) {
    next(err);
  }
}
