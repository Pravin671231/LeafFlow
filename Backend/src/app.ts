import "./config/env";
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { httpLogger } from "./middleware";
import router from "./routes";
import { errorHandler } from "./utils/errorHandler";

const app = express();

const origins = env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

app.use(cors({ origin: origins, credentials: true, optionsSuccessStatus: 200 }));
app.use(express.json());
app.use(cookieParser());
app.use(httpLogger);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", router);

app.use(errorHandler);

export default app;
