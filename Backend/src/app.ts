import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";
import { AppError } from "./utils/AppError";

const app = express();

if (!process.env.CORS_ORIGIN) {
  throw new Error("CORS_ORIGIN is not set");
}

const origins = process.env.CORS_ORIGIN
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: origins, credentials: true, optionsSuccessStatus: 200 }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", router);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Internal server error" });
});

export default app;
