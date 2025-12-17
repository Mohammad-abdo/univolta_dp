import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../config/prisma.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { requirePermission } from "../../common/middleware/permissions.js";
import { NotFoundError, BadRequestError } from "../../common/errors/AppError.js";
import { z } from "zod";
import { UserRole, Prisma } from "@prisma/client";
import { createOperationAlert } from "../alerts/alert.service.js";

const router = Router();

// Public routes for current user (no permission check needed)
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profile: user.profile,
    });
  } catch (error) {
    next(error);
  }
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
  profile: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
}).refine((data) => {
  // If newPassword is provided, currentPassword must also be provided
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required to change password",
  path: ["currentPassword"],
});

router.put("/me", requireAuth, async (req, res, next) => {
  try {
    const input = updateProfileSchema.parse(req.body);

    // Get current user to verify password if changing
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!currentUser) {
      throw new NotFoundError("User not found");
    }

    // Verify current password if changing password
    if (input.newPassword && input.currentPassword) {
      const passwordMatch = await bcrypt.compare(input.currentPassword, currentUser.passwordHash);
      if (!passwordMatch) {
        throw new BadRequestError("Current password is incorrect");
      }
    }

    const updateData: any = {};
    if (input.name) updateData.name = input.name;
    if (input.email) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;

    // Update password if provided
    if (input.newPassword) {
      updateData.passwordHash = await bcrypt.hash(input.newPassword, 10);
    }

    if (input.profile) {
      updateData.profile = {
        upsert: {
          create: input.profile,
          update: input.profile,
        },
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      include: {
        profile: true,
      },
    });

    res.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      profile: updatedUser.profile,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new BadRequestError(error.errors[0].message));
      return;
    }
    next(error);
  }
});

router.use(requireAuth, requirePermission("users", "read"));

router.get("/", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

const updateUserSchema = z.object({
  role: z.enum(["admin", "editor", "user"]).optional(),
  customRoleId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().trim().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "editor", "user"]).optional(),
  customRoleId: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

router.post("/", requirePermission("users", "create"), async (req, res, next) => {
  try {
    const input = createUserSchema.parse(req.body);
    const bcrypt = (await import("bcryptjs")).default;
    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: input.role || "user",
        customRoleId: input.customRoleId,
        isActive: input.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        universityId: true,
      },
    });

    // Create alert for user creation
    await createOperationAlert(
      "create",
      "users",
      user.name,
      user.id,
      req.user?.id,
      user.universityId ?? undefined,
      { email: user.email, role: user.role }
    );

    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new BadRequestError(error.errors[0].message));
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      next(new BadRequestError("Email already exists"));
      return;
    }
    next(error);
  }
});

router.put("/:id", requirePermission("users", "update"), async (req, res, next) => {
  try {
    const input = updateUserSchema.parse(req.body);

    if (Object.keys(input).length === 0) {
      throw new BadRequestError("At least one field must be provided");
    }

    // Get current user to check if email already exists (if changing email)
    const currentUser = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!currentUser) {
      throw new NotFoundError("User not found");
    }

    // Check if email is being changed and already exists
    const inputAny = input as any;
    if (inputAny.email && inputAny.email !== currentUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: inputAny.email },
      });
      if (existingUser) {
        throw new BadRequestError("Email already exists");
      }
    }

    const updateData: any = {};
    if (inputAny.name) updateData.name = inputAny.name;
    if (inputAny.email) updateData.email = inputAny.email;
    if (inputAny.phone !== undefined) updateData.phone = inputAny.phone;
    if (input.role) updateData.role = input.role;
    if (input.customRoleId !== undefined) updateData.customRoleId = input.customRoleId;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    
    // Update password if provided
    if (inputAny.password) {
      const bcrypt = (await import("bcryptjs")).default;
      updateData.passwordHash = await bcrypt.hash(inputAny.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        customRoleId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        universityId: true,
      },
    });

    // Create alert for user update
    await createOperationAlert(
      "update",
      "users",
      user.name,
      user.id,
      req.user?.id,
      user.universityId ?? undefined,
      { email: user.email, role: user.role, isActive: user.isActive }
    );

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new BadRequestError(error.errors[0].message));
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        next(new NotFoundError("User not found"));
        return;
      }
      if (error.code === "P2002") {
        next(new BadRequestError("Email already exists"));
        return;
      }
    }
    next(error);
  }
});

router.delete("/:id", requirePermission("users", "delete"), async (req, res, next) => {
  try {
    // Get user info before deletion for alert
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        universityId: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    await prisma.user.delete({
      where: { id: req.params.id },
    });

    // Create alert for user deletion
    await createOperationAlert(
      "delete",
      "users",
      user.name,
      user.id,
      req.user?.id,
      user.universityId ?? undefined,
      { email: user.email }
    );

    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      next(new NotFoundError("User not found"));
      return;
    }
    next(error);
  }
});

export default router;


