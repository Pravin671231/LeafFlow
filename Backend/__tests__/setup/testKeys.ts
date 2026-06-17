import { randomBytes } from "crypto";

if (!process.env.ACCESS_SECRET) {
  process.env.ACCESS_SECRET = randomBytes(32).toString("hex");
}

if (!process.env.REFRESH_SECRET) {
  process.env.REFRESH_SECRET = randomBytes(32).toString("hex");
}
