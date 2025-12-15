import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import env from "./config/env.js";
import logger from "./config/logger.js";
import { requestLogger } from "./common/middleware/requestLogger.js";
import { errorHandler, notFoundHandler } from "./common/middleware/errorHandler.js";
import healthRouter from "./modules/health/health.router.js";
import apiRouter from "./routes/index.js";
const app = express();
app.set("trust proxy", true);
// Configure helmet to not interfere with CORS
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({
    origin: env.CORS_ALLOWED_ORIGINS,
    credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestLogger);
// Serve uploaded files statically with CORS headers
const uploadsDir = path.join(process.cwd(), "uploads");
app.use("/uploads", (req, res, next) => {
    const allowedOrigins = Array.isArray(env.CORS_ALLOWED_ORIGINS)
        ? env.CORS_ALLOWED_ORIGINS
        : [env.CORS_ALLOWED_ORIGINS || "*"];
    const origin = req.headers.origin;
    // Always allow localhost:3000 for development
    const isAllowed = allowedOrigins.includes("*") ||
        (origin && allowedOrigins.includes(origin)) ||
        (origin && origin.includes("localhost:3000"));
    // Handle OPTIONS preflight
    if (req.method === "OPTIONS") {
        if (isAllowed) {
            if (origin) {
                res.header("Access-Control-Allow-Origin", origin);
                res.header("Access-Control-Allow-Credentials", "true");
            }
            else if (allowedOrigins.includes("*")) {
                res.header("Access-Control-Allow-Origin", "*");
            }
            res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Content-Type, Accept");
        }
        return res.sendStatus(200);
    }
    // Store in res.locals for setHeaders callback
    res.locals.corsOrigin = origin;
    res.locals.corsAllowed = isAllowed;
    // Set headers now - they should be preserved by static middleware
    if (isAllowed) {
        if (origin) {
            res.header("Access-Control-Allow-Origin", origin);
            res.header("Access-Control-Allow-Credentials", "true");
        }
        else if (allowedOrigins.includes("*")) {
            res.header("Access-Control-Allow-Origin", "*");
        }
        res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Accept");
    }
    next();
}, express.static(uploadsDir, {
    setHeaders: (res, path, stat) => {
        // Get from res.locals
        const origin = res.locals?.corsOrigin;
        const isAllowed = res.locals?.corsAllowed;
        // Ensure headers are set (in case static middleware clears them)
        if (isAllowed && origin) {
            res.setHeader("Access-Control-Allow-Origin", origin);
            res.setHeader("Access-Control-Allow-Credentials", "true");
            res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
        }
    }
}));
app.get("/", (req, res) => {
    res.json({
        name: "UniVolta API",
        version: "0.1.0",
    });
});
app.use("/api/v1/health", healthRouter);
app.use("/api/v1", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
app.on("ready", () => logger.info("Express app is ready"));
export default app;
//# sourceMappingURL=app.js.map