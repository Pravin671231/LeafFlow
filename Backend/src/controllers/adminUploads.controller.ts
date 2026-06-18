import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../utils/sendResponse";

export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    // TODO: call cloudinary service
    sendResponse({ res, data: { url: "" }, message: "Image uploaded" });
  } catch (err) {
    next(err);
  }
}
