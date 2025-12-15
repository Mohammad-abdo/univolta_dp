import { Router } from "express";
import prisma from "../../config/prisma.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { requirePermission } from "../../common/middleware/permissions.js";
import { NotFoundError, BadRequestError } from "../../common/errors/AppError.js";
import { z } from "zod";
import { Prisma } from "@prisma/client";
const router = Router();
router.use(requireAuth, requirePermission("users", "read"));
const createRoleSchema = z.object({
    name: z.string().trim().min(1, "Role name is required"),
    description: z.string().trim().optional(),
    permissionIds: z.array(z.string()).optional(),
});
const updateRoleSchema = z.object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    permissionIds: z.array(z.string()).optional(),
});
// Get all roles
router.get("/", async (_req, res, next) => {
    try {
        const roles = await prisma.role.findMany({
            include: {
                permissions: {
                    include: {
                        permission: true,
                    },
                },
                _count: {
                    select: {
                        users: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(roles.map((role) => ({
            id: role.id,
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
            permissions: role.permissions.map((rp) => rp.permission),
            userCount: role._count.users,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
        })));
    }
    catch (error) {
        next(error);
    }
});
// Get all permissions
router.get("/permissions", async (_req, res, next) => {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: [{ resource: "asc" }, { action: "asc" }],
        });
        res.json(permissions);
    }
    catch (error) {
        next(error);
    }
});
// Get single role
router.get("/:id", async (req, res, next) => {
    try {
        const role = await prisma.role.findUnique({
            where: { id: req.params.id },
            include: {
                permissions: {
                    include: {
                        permission: true,
                    },
                },
                _count: {
                    select: {
                        users: true,
                    },
                },
            },
        });
        if (!role) {
            throw new NotFoundError("Role not found");
        }
        res.json({
            id: role.id,
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
            permissions: role.permissions.map((rp) => rp.permission),
            userCount: role._count.users,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
        });
    }
    catch (error) {
        next(error);
    }
});
// Create role
router.post("/", requirePermission("users", "create"), async (req, res, next) => {
    try {
        const input = createRoleSchema.parse(req.body);
        const role = await prisma.role.create({
            data: {
                name: input.name,
                description: input.description,
                permissions: input.permissionIds
                    ? {
                        create: input.permissionIds.map((permissionId) => ({
                            permissionId,
                        })),
                    }
                    : undefined,
            },
            include: {
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
        res.status(201).json({
            id: role.id,
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
            permissions: role.permissions.map((rp) => rp.permission),
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
        });
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            next(new BadRequestError("Role name must be unique"));
            return;
        }
        next(error);
    }
});
// Update role
router.put("/:id", requirePermission("users", "update"), async (req, res, next) => {
    try {
        const input = updateRoleSchema.parse(req.body);
        // Check if role exists and is not a system role
        const existingRole = await prisma.role.findUnique({
            where: { id: req.params.id },
        });
        if (!existingRole) {
            throw new NotFoundError("Role not found");
        }
        if (existingRole.isSystem) {
            throw new BadRequestError("Cannot modify system roles");
        }
        // Update role
        const role = await prisma.role.update({
            where: { id: req.params.id },
            data: {
                name: input.name,
                description: input.description,
                ...(input.permissionIds !== undefined && {
                    permissions: {
                        deleteMany: {},
                        create: input.permissionIds.map((permissionId) => ({
                            permissionId,
                        })),
                    },
                }),
            },
            include: {
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
        res.json({
            id: role.id,
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
            permissions: role.permissions.map((rp) => rp.permission),
            updatedAt: role.updatedAt,
        });
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            next(new BadRequestError("Role name must be unique"));
            return;
        }
        next(error);
    }
});
// Delete role
router.delete("/:id", requirePermission("users", "delete"), async (req, res, next) => {
    try {
        const role = await prisma.role.findUnique({
            where: { id: req.params.id },
            include: {
                _count: {
                    select: {
                        users: true,
                    },
                },
            },
        });
        if (!role) {
            throw new NotFoundError("Role not found");
        }
        if (role.isSystem) {
            throw new BadRequestError("Cannot delete system roles");
        }
        if (role._count.users > 0) {
            throw new BadRequestError("Cannot delete role with assigned users");
        }
        await prisma.role.delete({
            where: { id: req.params.id },
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
// Create permission
router.post("/permissions", requirePermission("users", "create"), async (req, res, next) => {
    try {
        const { resource, action, description } = z
            .object({
            resource: z.string().trim().min(1, "Resource is required"),
            action: z.string().trim().min(1, "Action is required"),
            description: z.string().trim().optional(),
        })
            .parse(req.body);
        const permission = await prisma.permission.create({
            data: {
                resource,
                action,
                description,
            },
        });
        res.status(201).json(permission);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            next(new BadRequestError("Permission already exists"));
            return;
        }
        next(error);
    }
});
// Delete permission
router.delete("/permissions/:id", requirePermission("users", "delete"), async (req, res, next) => {
    try {
        const permission = await prisma.permission.findUnique({
            where: { id: req.params.id },
            include: {
                _count: {
                    select: {
                        roles: true,
                    },
                },
            },
        });
        if (!permission) {
            throw new NotFoundError("Permission not found");
        }
        if (permission._count.roles > 0) {
            throw new BadRequestError("Cannot delete permission assigned to roles");
        }
        await prisma.permission.delete({
            where: { id: req.params.id },
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=role.router.js.map