import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";
import { errorHandler } from "./utils/errorHandler";

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

app.use(errorHandler);

export default app;
