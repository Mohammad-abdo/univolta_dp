import app from "./app.js";
import env from "./config/env.js";
import logger from "./config/logger.js";
import prisma from "./config/prisma.js";

async function bootstrap() {
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 API listening on port ${env.PORT} (${env.NODE_ENV})`);
    app.emit("ready");
  });

  server.on("error", (err) => {
    logger.error({ err }, "Server error");
    process.exit(1);
  });
}

async function shutdown() {
  logger.info("Shutting down server...");
  await prisma.$disconnect();
  process.exit(0);
}

bootstrap().catch((err) => {
  logger.fatal({ err }, "Failed to bootstrap application");
  process.exit(1);
});

