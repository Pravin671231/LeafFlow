import { Request, Response, NextFunction } from "express";
import * as svc from "../services/adminCategories.service";
import { sendResponse } from "../utils/sendResponse";
import { CreateCategoryBody, UpdateCategoryBody } from "../schemas/catalog.schema";

export async function listCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await svc.listCategories();
    sendResponse({ res, data: { categories } });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await svc.createCategory(req.body as CreateCategoryBody);
    sendResponse({ res, statusCode: 201, data: { category }, message: "Category created" });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await svc.updateCategory(req.params.id as string, req.body as UpdateCategoryBody);
    sendResponse({ res, data: { category }, message: "Category updated" });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.deleteCategory(req.params.id as string);
    const message = result.deleted ? "Category deleted" : "Category deactivated";
    sendResponse({ res, message });
  } catch (err) {
    next(err);
  }
}
