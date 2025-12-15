import jwt from "jsonwebtoken";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";
import env from "../../config/env.js";
import prisma from "../../config/prisma.js";
import { UserRole } from "@prisma/client";
function extractBearerToken(req) {
    const header = req.headers.authorization ?? req.headers.Authorization;
    if (!header || typeof header !== "string") {
        return null;
    }
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return null;
    }
    return token;
}
export async function requireAuth(req, _res, next) {
    try {
        const token = extractBearerToken(req);
        if (!token) {
            throw new UnauthorizedError("Authentication required");
        }
        const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
        const user = await prisma.user.findFirst({
            where: { id: payload.sub, deletedAt: null },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                universityId: true,
            },
        });
        if (!user || !user.isActive) {
            throw new UnauthorizedError("Account disabled or not found");
        }
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            universityId: user.universityId,
        };
        next();
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            next(new UnauthorizedError("Session expired, please login again"));
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            next(new UnauthorizedError("Invalid authentication token"));
            return;
        }
        next(error);
    }
}
export function requireAdmin(req, _res, next) {
    if (!req.user) {
        next(new UnauthorizedError("Authentication required"));
        return;
    }
    if (req.user.role !== UserRole.admin) {
        next(new ForbiddenError("Admin privileges required"));
        return;
    }
    next();
}
export function requireEditor(req, _res, next) {
    if (!req.user) {
        next(new UnauthorizedError("Authentication required"));
        return;
    }
    if (req.user.role !== UserRole.admin && req.user.role !== UserRole.editor) {
        next(new ForbiddenError("Editor or Admin privileges required"));
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map