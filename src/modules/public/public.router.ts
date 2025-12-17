import { Router } from "express";
import prisma from "../../config/prisma.js";
import { universities as fallbackUniversities } from "./public.data.js";
import { z } from "zod";

const router = Router();

const querySchema = z.object({
  country: z.string().optional(),
  language: z.string().optional(),
  search: z.string().optional(),
  specialization: z.string().optional(),
  department: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
});

router.get("/universities", async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    const where: any = { isActive: true };

    if (query.country) {
      where.country = { contains: query.country };
    }

    if (query.language) {
      where.language = { contains: query.language };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { country: { contains: query.search } },
        { city: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    // Filter by specialization/department through programs
    if (query.specialization || query.department) {
      where.programs = {
        some: {
          isActive: true,
          ...(query.department && { department: { contains: query.department } }),
          ...(query.specialization && { name: { contains: query.specialization } }),
        },
      };
    }

    const [universities, total] = await Promise.all([
      prisma.university.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        include: {
          programs: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              slug: true,
              degree: true,
              duration: true,
              language: true,
            },
          },
          testimonials: {
            where: { isPublished: true },
            select: {
              id: true,
              author: true,
              content: true,
              rating: true,
            },
            take: 3,
          },
        },
      }),
      prisma.university.count({ where }),
    ]);

    const serialized =
      universities.length > 0
        ? universities.map((university) => ({
            id: university.id,
            name: university.name,
            slug: university.slug,
            country: university.country,
            city: university.city,
            language: university.language,
            description: university.description,
            about: university.about,
            logo: university.logoUrl,
            bannerUrl: university.bannerUrl,
            image1: university.bannerUrl || university.logoUrl,
            image2: university.logoUrl,
            establishmentYear: university.establishmentYear,
            worldRanking: university.worldRanking,
            localRanking: university.localRanking,
            studentsNumber: university.studentsNumber,
            admissionRequirements: Array.isArray(university.admissionRequirements)
              ? university.admissionRequirements
              : [],
            services: Array.isArray(university.services) ? university.services : [],
            tourImages: Array.isArray(university.tourImages) ? university.tourImages : [],
            majors: university.programs.map((program) => program.name),
            programs: university.programs,
            testimonials: university.testimonials,
          }))
        : fallbackUniversities;

    const pages = Math.ceil(total / query.limit);

    res.json({
      data: serialized,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        pages,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/universities/:slug", async (req, res, next) => {
  try {
    const slug = req.params.slug;
    
    if (!slug) {
      return res.status(400).json({ 
        error: "Invalid request",
        message: "University slug is required"
      });
    }

    const university = await prisma.university.findFirst({
      where: { 
        slug: slug,
        isActive: true 
      },
      include: {
        programs: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            degree: true,
            duration: true,
            language: true,
            tuition: true,
            tuitionNotes: true,
            // Only include fields that exist in the database
            // department might not exist, so we'll handle it separately
          },
        },
        testimonials: {
          where: { isPublished: true },
          select: {
            id: true,
            author: true,
            content: true,
            rating: true,
          },
        },
      },
    });

    if (!university) {
      return res.status(404).json({ 
        error: "University not found",
        message: `No active university found with slug: ${slug}`
      });
    }

    // Safely handle JSON fields that might be stored as strings
    let admissionRequirements = [];
    try {
      admissionRequirements = Array.isArray(university.admissionRequirements)
        ? university.admissionRequirements
        : typeof university.admissionRequirements === 'string'
        ? JSON.parse(university.admissionRequirements)
        : [];
    } catch {
      admissionRequirements = [];
    }

    let services = [];
    try {
      services = Array.isArray(university.services)
        ? university.services
        : typeof university.services === 'string'
        ? JSON.parse(university.services)
        : [];
    } catch {
      services = [];
    }

    let tourImages = [];
    try {
      tourImages = Array.isArray(university.tourImages)
        ? university.tourImages
        : typeof university.tourImages === 'string'
        ? JSON.parse(university.tourImages)
        : [];
    } catch {
      tourImages = [];
    }

    // Map programs to only include the fields we need
    // Note: Only include fields that exist in the database (based on initial migration)
    const programsData = (university.programs || []).map((program: any) => ({
      id: program.id,
      name: program.name,
      slug: program.slug,
      degree: program.degree || null,
      duration: program.duration || null,
      language: program.language || null,
      tuition: program.tuition || null,
      tuitionNotes: program.tuitionNotes || null,
      // department and other fields may not exist in DB yet, so we'll set them to null
      department: null,
    }));

    res.json({
      id: university.id,
      name: university.name,
      slug: university.slug,
      country: university.country,
      city: university.city,
      language: university.language,
      description: university.description || null,
      about: university.about || null,
      website: university.website || null,
      logo: university.logoUrl || null,
      logoUrl: university.logoUrl || null,
      bannerUrl: university.bannerUrl || null,
      establishmentYear: university.establishmentYear || null,
      worldRanking: university.worldRanking || null,
      localRanking: university.localRanking || null,
      studentsNumber: university.studentsNumber || null,
      admissionRequirements: admissionRequirements,
      services: services,
      tourImages: tourImages,
      programs: programsData,
      programsNumber: programsData.length,
      testimonials: university.testimonials || [],
    });
  } catch (error: any) {
    console.error("Error fetching university by slug:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error?.message || "Failed to fetch university details"
    });
  }
});

router.get("/programs/:slug", async (req, res, next) => {
  try {
    const program = await prisma.program.findUnique({
      where: { slug: req.params.slug, isActive: true },
      include: {
        university: {
          select: {
            id: true,
            name: true,
            slug: true,
            country: true,
            city: true,
            logoUrl: true,
            admissionRequirements: true,
            services: true,
          },
        },
      },
    });

    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }

    // Safely parse JSON fields
    let coreSubjects = [];
    try {
      coreSubjects = Array.isArray(program.coreSubjects)
        ? program.coreSubjects
        : typeof program.coreSubjects === 'string'
        ? JSON.parse(program.coreSubjects)
        : [];
    } catch {
      coreSubjects = [];
    }

    let programImages = [];
    try {
      programImages = Array.isArray(program.programImages)
        ? program.programImages
        : typeof program.programImages === 'string'
        ? JSON.parse(program.programImages)
        : [];
    } catch {
      programImages = [];
    }

    // Parse university admission requirements and services
    let admissionRequirements = [];
    try {
      admissionRequirements = Array.isArray(program.university.admissionRequirements)
        ? program.university.admissionRequirements
        : typeof program.university.admissionRequirements === 'string'
        ? JSON.parse(program.university.admissionRequirements)
        : [];
    } catch {
      admissionRequirements = [];
    }

    let services = [];
    try {
      services = Array.isArray(program.university.services)
        ? program.university.services
        : typeof program.university.services === 'string'
        ? JSON.parse(program.university.services)
        : [];
    } catch {
      services = [];
    }

    res.json({
      id: program.id,
      name: program.name,
      slug: program.slug,
      degree: program.degree,
      duration: program.duration,
      language: program.language,
      tuition: program.tuition,
      tuitionNotes: program.tuitionNotes,
      studyYear: program.studyYear,
      lastApplicationDate: program.lastApplicationDate,
      classSchedule: program.classSchedule,
      studyMethod: program.studyMethod,
      startDate: program.startDate,
      coreSubjects: coreSubjects,
      about: program.about,
      department: program.department,
      programImages: programImages,
      bannerImage: program.bannerImage,
      university: {
        id: program.university.id,
        name: program.university.name,
        slug: program.university.slug,
        country: program.university.country,
        city: program.university.city,
        logoUrl: program.university.logoUrl,
        admissionRequirements,
        services,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get programs by university slug
router.get("/universities/:slug/programs", async (req, res, next) => {
  try {
    const university = await prisma.university.findUnique({
      where: { slug: req.params.slug, isActive: true },
      select: { id: true },
    });

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    const programs = await prisma.program.findMany({
      where: {
        universityId: university.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        degree: true,
        duration: true,
        language: true,
        tuition: true,
        tuitionNotes: true,
        department: true,
        bannerImage: true,
        programImages: true,
        studyMethod: true,
        startDate: true,
        classSchedule: true,
        about: true,
        coreSubjects: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Parse JSON fields that might be stored as strings
    const parsedPrograms = programs.map((program: any) => {
      let programImages = [];
      try {
        programImages = Array.isArray(program.programImages)
          ? program.programImages
          : typeof program.programImages === 'string' && program.programImages
          ? JSON.parse(program.programImages)
          : [];
      } catch {
        programImages = [];
      }

      let coreSubjects = [];
      try {
        coreSubjects = Array.isArray(program.coreSubjects)
          ? program.coreSubjects
          : typeof program.coreSubjects === 'string' && program.coreSubjects
          ? JSON.parse(program.coreSubjects)
          : [];
      } catch {
        coreSubjects = [];
      }

      return {
        ...program,
        programImages: programImages,
        coreSubjects: coreSubjects,
      };
    });

    res.json(parsedPrograms);
  } catch (error) {
    next(error);
  }
});

// Public testimonials endpoint
router.get("/testimonials", async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const testimonials = await prisma.testimonial.findMany({
      where: {
        isPublished: true,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        university: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
      },
    });

    const serialized = testimonials.map((t) => ({
      id: t.id,
      author: t.author,
      content: t.content,
      rating: t.rating,
      university: t.university?.name,
      country: t.university?.country,
      avatarUrl: (t as any).avatarUrl || null,
    }));

    res.json(serialized);
  } catch (error) {
    next(error);
  }
});

// Public FAQs endpoint
router.get("/faqs", async (req, res, next) => {
  try {
    const faqs = await prisma.faq.findMany({
      where: {
        isPublished: true,
      },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
      },
    });

    res.json(faqs);
  } catch (error) {
    next(error);
  }
});

export default router;


