import pino from "pino";

const isDev = (process.env.NODE_ENV ?? "development") === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

export function createLogger(module: string): pino.Logger {
  return logger.child({ module });
}
