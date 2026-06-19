import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../utils/sendResponse";
import { uploadImage } from "../services/integrations/cloudinary.service";
import { AppError } from "../utils/AppError";

type MulterRequest = Request & { file?: { buffer: Buffer; mimetype: string } };

export async function uploadImageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { file } = req as MulterRequest;
    if (!file) {
      return next(new AppError(400, "NO_FILE", "Image file is required"));
    }
    const url = await uploadImage(file.buffer, file.mimetype);
    sendResponse({ res, statusCode: 201, data: { url }, message: "Image uploaded" });
  } catch (err) {
    next(err);
  }
}
