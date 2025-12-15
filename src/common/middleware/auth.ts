import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";
import env from "../../config/env.js";
import prisma from "../../config/prisma.js";
import { UserRole } from "@prisma/client";

type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  name?: string;
  email?: string;
  iat: number;
  exp: number;
};

function extractBearerToken(req: Request): string | null {
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

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedError("Authentication required");
    }

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

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
  } catch (error) {
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

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
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

export function requireEditor(req: Request, _res: Response, next: NextFunction) {
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

/**
 * Optional authentication middleware - sets req.user if token is valid, but doesn't fail if token is missing
 * Useful for public routes that can work with or without authentication
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      // No token provided - that's okay for optional auth
      next();
      return;
    }

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

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

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        universityId: user.universityId,
      };
    }
    // If user not found or inactive, just continue without req.user
    // This allows the route to work for both authenticated and unauthenticated users

    next();
  } catch (error) {
    // If token is invalid/expired, just continue without req.user
    // Don't throw error for optional auth
    if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
      next();
      return;
    }

    next(error);
  }
}


