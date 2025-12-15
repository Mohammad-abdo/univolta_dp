import pino from "pino";
import env from "./env.js";

const logger = pino({
  name: "univolta-api",
  level: env.NODE_ENV === "development" ? "debug" : "info",
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
          },
        }
      : undefined,
});

export default logger;

