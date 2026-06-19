import multer from "multer";
import { AppError } from "../utils/AppError";
import { UPLOAD_ALLOWED_MIME_TYPES, UPLOAD_MAX_SIZE_BYTES } from "../config/constants";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    if (!(UPLOAD_ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      return cb(new AppError(400, "INVALID_FILE_TYPE", "Only JPEG, PNG, and WebP images are allowed"));
    }
    cb(null, true);
  },
}).single("image");
