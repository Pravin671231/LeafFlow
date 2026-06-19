import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(buffer: Buffer, mimetype: string): Promise<string> {
  const extension = mimetype.split("/")[1];

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "leafflow/products", format: extension },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
