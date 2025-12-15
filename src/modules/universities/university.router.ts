import { Router } from "express";
import prisma from "../../config/prisma.js";
import { createUniversitySchema, updateUniversitySchema } from "./university.validator.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { requirePermission } from "../../common/middleware/permissions.js";
import { BadRequestError, NotFoundError } from "../../common/errors/AppError.js";
import { Prisma } from "@prisma/client";
import { createOperationAlert } from "../alerts/alert.service.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (_req, res, next) => {
  try {
    const universities = await prisma.university.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        country: true,
        city: true,
        language: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            programs: true,
            applications: true,
            testimonials: true,
          },
        },
      },
    });

    res.json(
      universities.map((university) => ({
        ...university,
        programCount: university._count.programs,
        applicationCount: university._count.applications,
        testimonialCount: university._count.testimonials,
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const university = await prisma.university.findUnique({
      where: { id: req.params.id },
      include: {
        programs: true,
        testimonials: true,
        users: {
          where: {
            role: "university",
            universityId: req.params.id,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
      },
    });

    if (!university) {
      throw new NotFoundError("University not found");
    }

    res.json(university);
  } catch (error) {
    next(error);
  }
});

router.post("/", requirePermission("universities", "create"), async (req, res, next) => {
  try {
    const input = createUniversitySchema.parse(req.body);
    const university = await prisma.university.create({
      data: {
        name: input.name,
        slug: input.slug,
        country: input.country,
        city: input.city,
        language: input.language,
        description: input.description,
        about: input.about,
        website: input.website,
        logoUrl: input.logoUrl,
        bannerUrl: input.bannerUrl,
        establishmentYear: input.establishmentYear,
        worldRanking: input.worldRanking,
        localRanking: input.localRanking,
        studentsNumber: input.studentsNumber,
        admissionRequirements: input.admissionRequirements,
        services: input.services,
        tourImages: input.tourImages,
        isActive: input.isActive ?? true,
      },
    });

    // Create alert for university creation
    await createOperationAlert(
      "create",
      "universities",
      university.name,
      university.id,
      req.user?.id,
      university.id,
      { country: university.country, city: university.city }
    );

    res.status(201).json(university);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      next(new BadRequestError("University slug must be unique"));
      return;
    }
    next(error);
  }
});

router.put("/:id", requirePermission("universities", "update"), async (req, res, next) => {
  try {
    const data = updateUniversitySchema.parse(req.body);
    const university = await prisma.university.update({
      where: { id: req.params.id },
      data,
    });

    // Create alert for university update
    await createOperationAlert(
      "update",
      "universities",
      university.name,
      university.id,
      req.user?.id,
      university.id,
      { country: university.country, city: university.city }
    );

    res.json(university);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      next(new NotFoundError("University not found"));
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      next(new BadRequestError("University slug must be unique"));
      return;
    }
    next(error);
  }
});

router.delete("/:id", requirePermission("universities", "delete"), async (req, res, next) => {
  try {
    // Get university info before deletion for alert
    const university = await prisma.university.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true },
    });

    if (!university) {
      throw new NotFoundError("University not found");
    }

    await prisma.university.delete({
      where: { id: req.params.id },
    });

    // Create alert for university deletion
    await createOperationAlert(
      "delete",
      "universities",
      university.name,
      university.id,
      req.user?.id,
      university.id
    );

    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      next(new NotFoundError("University not found"));
      return;
    }
    next(error);
  }
});

export default router;


