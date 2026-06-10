import cors from "cors";
import { env } from "../config/env";

const origins = env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

export const corsMiddleware = cors({
  origin: origins,
  credentials: true,
  optionsSuccessStatus: 200,
});
