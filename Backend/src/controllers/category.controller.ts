import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../utils/sendResponse";

export async function listCategories(req: Request, res: Response, next: NextFunction) {
  try {
    // TODO: call category service
    sendResponse({ res, data: { categories: [] } });
  } catch (err) {
    next(err);
  }
}
