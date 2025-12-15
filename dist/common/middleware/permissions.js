import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";
import { canAccess } from "../permissions.js";
/**
 * Middleware to check if user has permission for a specific resource and action
 */
export function requirePermission(resource, action) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new UnauthorizedError("Authentication required"));
            return;
        }
        if (!canAccess(req.user.role, resource, action)) {
            next(new ForbiddenError(`You don't have permission to ${action} ${resource}`));
            return;
        }
        next();
    };
}
/**
 * Middleware to check if user has any of the specified permissions
 */
export function requireAnyPermission(...permissions) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new UnauthorizedError("Authentication required"));
            return;
        }
        const hasAnyPermission = permissions.some(({ resource, action }) => canAccess(req.user.role, resource, action));
        if (!hasAnyPermission) {
            next(new ForbiddenError("You don't have permission to perform this action"));
            return;
        }
        next();
    };
}
/**
 * Middleware to check if user has all of the specified permissions
 */
export function requireAllPermissions(...permissions) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new UnauthorizedError("Authentication required"));
            return;
        }
        const hasAllPermissions = permissions.every(({ resource, action }) => canAccess(req.user.role, resource, action));
        if (!hasAllPermissions) {
            next(new ForbiddenError("You don't have permission to perform this action"));
            return;
        }
        next();
    };
}
//# sourceMappingURL=permissions.js.map