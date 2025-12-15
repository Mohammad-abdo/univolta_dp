import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../../config/prisma.js";
import env from "../../config/env.js";
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema, universitySignupSchema } from "./auth.validator.js";
import { UnauthorizedError, BadRequestError, NotFoundError } from "../../common/errors/AppError.js";
import { createAuthTokens, revokeUserRefreshTokens } from "./token.service.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { createOperationAlert } from "../alerts/alert.service.js";

const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Check if user exists (without active/deleted filters first for debugging)
    const userExists = await prisma.user.findFirst({
      where: { email },
      select: { id: true, isActive: true, deletedAt: true, role: true },
    });

    if (!userExists) {
      console.log(`[AUTH] Login attempt failed: User not found with email: ${email}`);
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!userExists.isActive) {
      console.log(`[AUTH] Login attempt failed: User ${email} is inactive`);
      // Check if it's a university user waiting for approval
      if (userExists.role === "university") {
        throw new UnauthorizedError("Your account is pending admin approval. Please wait for approval before logging in.");
      }
      throw new UnauthorizedError("Account is inactive. Please contact support.");
    }

    if (userExists.deletedAt) {
      console.log(`[AUTH] Login attempt failed: User ${email} is deleted`);
      throw new UnauthorizedError("Invalid credentials");
    }

    // Now get the full user with password hash
    const user = await prisma.user.findFirst({
      where: {
        email,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      console.log(`[AUTH] Login attempt failed: Password mismatch for user: ${email}`);
      throw new UnauthorizedError("Invalid credentials");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const tokens = await createAuthTokens(user, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        universityId: user.universityId,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      universityId: user.universityId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      profile: user.profile,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password, phone } = signupSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestError("User with this email already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: "user",
        isActive: true,
      },
    });

    // Create profile
    await prisma.profile.create({
      data: {
        userId: user.id,
      },
    });

    // Generate tokens
    const tokens = await createAuthTokens(user, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// University registration endpoint - DISABLED: Only admin can add universities through dashboard
/*
router.post("/signup/university", async (req, res, next) => {
  try {
    const input = universitySignupSchema.parse(req.body);

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.adminEmail },
    });

    if (existingUser) {
      throw new BadRequestError("User with this email already exists");
    }

    // Generate slug from university name
    const slug = input.universityName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug already exists
    const existingUniversity = await prisma.university.findUnique({
      where: { slug },
    });

    if (existingUniversity) {
      throw new BadRequestError("A university with a similar name already exists. Please contact support.");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.adminPassword, 10);

    // Create university (inactive until admin approval)
    const university = await prisma.university.create({
      data: {
        name: input.universityName,
        slug,
        country: input.country,
        city: input.city,
        language: input.language,
        website: input.website || null,
        description: input.description || null,
        isActive: false, // Requires admin approval
      },
    });

    // Create university partner user (inactive until admin approval)
    const user = await prisma.user.create({
      data: {
        name: input.adminName,
        email: input.adminEmail,
        phone: input.adminPhone || null,
        passwordHash,
        role: "university",
        universityId: university.id,
        isActive: false, // Requires admin approval
      },
    });

    // Create profile
    await prisma.profile.create({
      data: {
        userId: user.id,
      },
    });

    // Create alert for admin to review and approve
    await createOperationAlert(
      "create",
      "universities",
      university.name,
      university.id,
      null,
      university.id,
      { 
        country: university.country, 
        city: university.city,
        adminEmail: user.email,
        adminName: user.name,
        requiresApproval: true,
        message: `New university registration requires approval: ${university.name}`
      }
    );

    // Return success message (no tokens - user needs approval first)
    res.status(201).json({
      message: "University registration submitted successfully. Your account is pending admin approval. You will receive an email once your account is activated.",
      university: {
        id: university.id,
        name: university.name,
        slug: university.slug,
        isActive: university.isActive,
      },
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new BadRequestError(error.errors[0].message));
      return;
    }
    next(error);
  }
});
*/

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not for security
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = await bcrypt.hash(resetToken, 10);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token (you might want to create a PasswordReset model)
      // For now, we'll store it in user settings or create a separate table
      // This is a simplified version - in production, use a proper PasswordReset table
      await prisma.user.update({
        where: { id: user.id },
        data: {
          // Store in a JSON field or create a proper PasswordReset model
        },
      });

      // TODO: Send email with reset link
      // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      // await sendPasswordResetEmail(user.email, resetLink);
    }

    // Always return success to prevent email enumeration
    res.json({
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    // TODO: Verify token and update password
    // This is a simplified version - in production, use a proper PasswordReset model
    // For now, we'll just return an error indicating this needs to be implemented
    throw new BadRequestError("Password reset functionality needs to be fully implemented with a PasswordReset model");
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token required");
    }

    // Verify refresh token JWT
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
      sub: string;
      token: string;
    };

    // Find the refresh token in database
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        userId: decoded.sub,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Verify the raw token matches
    const tokenMatch = await bcrypt.compare(decoded.token, storedToken.tokenHash);
    if (!tokenMatch) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    // Check if user is still active
    if (!storedToken.user.isActive || storedToken.user.deletedAt) {
      throw new UnauthorizedError("Account disabled or deleted");
    }

    // Generate new tokens
    const tokens = await createAuthTokens(storedToken.user, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Revoke old refresh token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: storedToken.user.id,
        name: storedToken.user.name,
        email: storedToken.user.email,
        role: storedToken.user.role,
        universityId: storedToken.user.universityId,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError("Invalid or expired refresh token"));
      return;
    }
    next(error);
  }
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    await revokeUserRefreshTokens(req.user.id, req.headers["user-agent"]);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;


