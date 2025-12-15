import logger from "../../config/logger.js";
export function requestLogger(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info({
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration,
        }, "http_request");
    });
    next();
}
//# sourceMappingURL=requestLogger.js.map