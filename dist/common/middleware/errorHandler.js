import { ZodError } from "zod";
import { AppError } from "../errors/AppError.js";
import logger from "../../config/logger.js";
export function notFoundHandler(req, res) {
    res.status(404).json({
        error: "Not Found",
        message: `Route ${req.method} ${req.originalUrl} does not exist`,
    });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) {
    if (err instanceof ZodError) {
        logger.warn({ err }, "Validation error");
        return res.status(400).json({
            error: "ValidationError",
            message: "Invalid request data",
            details: err.errors,
        });
    }
    if (err instanceof AppError) {
        if (err.statusCode >= 500) {
            logger.error({ err }, "AppError");
        }
        else {
            logger.warn({ err }, "AppError");
        }
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
        });
    }
    logger.error({ err }, "Unhandled error");
    return res.status(500).json({
        error: "InternalServerError",
        message: "Something went wrong",
    });
}
//# sourceMappingURL=errorHandler.js.map