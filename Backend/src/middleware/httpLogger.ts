import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import pinoHttp from "pino-http";
import { logger } from "../utils/logger";

export const httpLogger = pinoHttp({
  logger,
  genReqId(req: IncomingMessage) {
    return (req.headers["x-request-id"] as string) ?? crypto.randomUUID();
  },
  customLogLevel(req: IncomingMessage, res: ServerResponse, err?: Error) {
    if (req.url === "/health") return "silent";
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
