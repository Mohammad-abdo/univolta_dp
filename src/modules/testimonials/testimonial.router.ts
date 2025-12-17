import { Router } from "express";
import prisma from "../../config/prisma.js";
import {
  createTestimonialSchema,
  listTestimonialsQuerySchema,
  updateTestimonialSchema,
} from "./testimonial.validator.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { requirePermission } from "../../common/middleware/permissions.js";
import { BadRequestError, NotFoundError } from "../../common/errors/AppError.js";
import { Prisma } from "@prisma/client";
import { createOperationAlert } from "../alerts/alert.service.js";

const router = Router();

// Public route - anyone can read published testimonials
router.get("/", async (req, res, next) => {
  try {
    const query = listTestimonialsQuerySchema.parse(req.query);
    const testimonials = await prisma.testimonial.findMany({
      where: {
        universityId: query.universityId,
        isPublished: query.isPublished ?? undefined,
      },
      orderBy: { createdAt: "desc" },
      include: {
        university: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(testimonials);
  } catch (error) {
    next(error);
  }
});

// Protected routes - require authentication
router.use(requireAuth);

router.get("/:id", requirePermission("testimonials", "read"), async (req, res, next) => {
  try {
    const testimonial = await prisma.testimonial.findUnique({
      where: { id: req.params.id },
      include: {
        university: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!testimonial) {
      throw new NotFoundError("Testimonial not found");
    }

    res.json(testimonial);
  } catch (error) {
    next(error);
  }
});

router.post("/", requirePermission("testimonials", "create"), async (req, res, next) => {
  try {
    const input = createTestimonialSchema.parse(req.body);
    const testimonial = await prisma.testimonial.create({
      data: {
        author: input.author,
        role: input.role,
        title: input.title,
        content: input.content,
        rating: input.rating,
        isPublished: input.isPublished ?? true,
        universityId: input.universityId,
        userId: req.user?.id,
      },
    });

    // Create alert for testimonial creation
    await createOperationAlert(
      "create",
      "testimonials",
      testimonial.author,
      testimonial.id,
      req.user?.id,
      testimonial.universityId ?? undefined,
      { title: testimonial.title, rating: testimonial.rating }
    );

    res.status(201).json(testimonial);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      next(new BadRequestError("Invalid university selection"));
      return;
    }
    next(error);
  }
});

router.put("/:id", requirePermission("testimonials", "update"), async (req, res, next) => {
  try {
    const input = updateTestimonialSchema.parse(req.body);
    const testimonial = await prisma.testimonial.update({
      where: { id: req.params.id },
      data: input,
    });

    // Create alert for testimonial update
    await createOperationAlert(
      "update",
      "testimonials",
      testimonial.author,
      testimonial.id,
      req.user?.id,
      testimonial.universityId ?? undefined,
      { title: testimonial.title, rating: testimonial.rating }
    );

    res.json(testimonial);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      next(new NotFoundError("Testimonial not found"));
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      next(new BadRequestError("Invalid university selection"));
      return;
    }
    next(error);
  }
});

router.delete("/:id", requirePermission("testimonials", "delete"), async (req, res, next) => {
  try {
    // Get testimonial info before deletion for alert
    const testimonial = await prisma.testimonial.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        author: true,
        title: true,
        universityId: true,
      },
    });

    if (!testimonial) {
      throw new NotFoundError("Testimonial not found");
    }

    await prisma.testimonial.delete({
      where: { id: req.params.id },
    });

    // Create alert for testimonial deletion
    await createOperationAlert(
      "delete",
      "testimonials",
      testimonial.author,
      testimonial.id,
      req.user?.id,
      testimonial.universityId ?? undefined,
      { title: testimonial.title }
    );

    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      next(new NotFoundError("Testimonial not found"));
      return;
    }
    next(error);
  }
});

export default router;


