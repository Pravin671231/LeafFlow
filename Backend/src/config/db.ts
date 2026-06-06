import mongoose from "mongoose";

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(uri);
      console.log("MongoDB connected");
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${MAX_ATTEMPTS} failed:`, error);
      if (attempt === MAX_ATTEMPTS) {
        console.error("MongoDB connection failed after maximum attempts. Exiting.");
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
