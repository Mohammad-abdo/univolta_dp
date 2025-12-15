import { PrismaClient } from "@prisma/client";
import logger from "./logger.js";
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
});
prisma.$on("error", (event) => {
    logger.error({ event }, "Prisma error");
});
export default prisma;
//# sourceMappingURL=prisma.js.map