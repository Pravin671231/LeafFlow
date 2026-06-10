import express from "express";
import cookieParser from "cookie-parser";
import { corsMiddleware, httpLogger, errorHandler } from "./middleware";
import router from "./routes";

const app = express();

app.use(corsMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use(httpLogger);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", router);

app.use(errorHandler);

export default app;
