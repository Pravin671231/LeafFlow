import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../utils/sendResponse";
import * as svc from "../services/category.service";

export async function listCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await svc.listCategories();
    sendResponse({ res, data: { categories } });
  } catch (err) {
    next(err);
  }
}
