import { Router } from "express";
import { z } from "zod";
import prisma from "../../config/prisma.js";
import {
  createProgramSchema,
  listProgramsQuerySchema,
  updateProgramSchema,
} from "./program.validator.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { requirePermission } from "../../common/middleware/permissions.js";
import { BadRequestError, NotFoundError } from "../../common/errors/AppError.js";
import { Prisma } from "@prisma/client";
import { createOperationAlert } from "../alerts/alert.service.js";

const router = Router();

// Public route - Get programs grouped by specialization
router.get("/specializations", async (req, res, next) => {
  try {
    const { universityId, degree } = z.object({
      universityId: z.string().optional(),
      degree: z.string().optional(),
    }).parse(req.query);

    const where: any = { isActive: true };
    if (universityId) where.universityId = universityId;
    if (degree) where.degree = { contains: degree };

    const programs = await prisma.program.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        degree: true,
        // department: true, // Not in database yet
        tuition: true,
      },
    });

    // Group by department/specialization
    const grouped = programs.reduce((acc, program) => {
      // Extract from program name since department column doesn't exist in database yet
      const key = program.name.split(" ")[0] || "Other";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(program);
      return acc;
    }, {} as Record<string, typeof programs>);

    const result = Object.entries(grouped)
      .map(([specialization, progs]) => ({
        specialization,
        programCount: progs.length,
        programs: progs,
      }))
      .sort((a, b) => a.specialization.localeCompare(b.specialization));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const query = listProgramsQuerySchema.parse(req.query);
    const where: any = {};

    if (query.universityId) {
      where.universityId = query.universityId;
    }

    if (query.degree) {
      where.degree = { contains: query.degree };
    }

    // Note: department column doesn't exist in database yet, so we skip this filter
    // if (query.department) {
    //   where.department = { contains: query.department };
    // }

    const programs = await prisma.program.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        university: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    res.json(programs);
  } catch (error) {
    console.error("Error fetching programs:", error);
    next(error);
  }
});


router.get("/:id", async (req, res, next) => {
  try {
    const program = await prisma.program.findUnique({
      where: { id: req.params.id },
      include: {
        university: true,
      },
    });

    if (!program) {
      throw new NotFoundError("Program not found");
    }

    res.json(program);
  } catch (error) {
    next(error);
  }
});

router.post("/", requirePermission("programs", "create"), async (req, res, next) => {
  try {
    const input = createProgramSchema.parse(req.body);

    const program = await prisma.program.create({
      data: {
        universityId: input.universityId,
        name: input.name,
        slug: input.slug,
        degree: input.degree,
        duration: input.duration,
        language: input.language,
        tuition: input.tuition,
        tuitionNotes: input.tuitionNotes,
        studyYear: input.studyYear,
        lastApplicationDate: input.lastApplicationDate,
        classSchedule: input.classSchedule,
        studyMethod: input.studyMethod,
        startDate: input.startDate,
        coreSubjects: input.coreSubjects ? JSON.parse(JSON.stringify(input.coreSubjects)) : null,
        about: input.about,
        department: input.department,
        programImages: input.programImages ? JSON.parse(JSON.stringify(input.programImages)) : null,
        bannerImage: input.bannerImage,
        isActive: input.isActive ?? true,
      },
      include: {
        university: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create alert for program creation
    await createOperationAlert(
      "create",
      "programs",
      program.name,
      program.id,
      req.user?.id,
      program.universityId,
      { degree: program.degree, universityName: program.university.name }
    );

    res.status(201).json(program);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      next(new BadRequestError("Program slug must be unique"));
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      next(new BadRequestError("Invalid university ID"));
      return;
    }
    next(error);
  }
});

router.put("/:id", requirePermission("programs", "update"), async (req, res, next) => {
  try {
    const input = updateProgramSchema.parse(req.body);
    const program = await prisma.program.update({
      where: { id: req.params.id },
      data: input,
      include: {
        university: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create alert for program update
    await createOperationAlert(
      "update",
      "programs",
      program.name,
      program.id,
      req.user?.id,
      program.universityId,
      { degree: program.degree, universityName: program.university.name }
    );

    res.json(program);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      next(new NotFoundError("Program not found"));
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      next(new BadRequestError("Program slug must be unique"));
      return;
    }
    next(error);
  }
});

router.delete("/:id", requirePermission("programs", "delete"), async (req, res, next) => {
  try {
    // Get program info before deletion for alert
    const program = await prisma.program.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        universityId: true,
        university: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundError("Program not found");
    }

    await prisma.program.delete({
      where: { id: req.params.id },
    });

    // Create alert for program deletion
    await createOperationAlert(
      "delete",
      "programs",
      program.name,
      program.id,
      req.user?.id,
      program.universityId,
      { universityName: program.university.name }
    );

    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      next(new NotFoundError("Program not found"));
      return;
    }
    next(error);
  }
});

export default router;


