import { Router } from "express";
import prisma from "../../config/prisma.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { NotFoundError, BadRequestError } from "../../common/errors/AppError.js";
import { z } from "zod";
import { AlertType, AlertSeverity } from "@prisma/client";
import { createOperationAlert, createStatusChangeAlert, createAlert } from "../alerts/alert.service.js";
import universityEntitiesRouter from "./university-entities.router.js";

const router = Router();

// All partner routes require authentication
router.use(requireAuth);

// Middleware to check if user is a university partner
const requirePartner = async (req: any, res: any, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { university: true },
    });

    if (!user || !user.universityId) {
      return res.status(403).json({ error: "Access denied. University partner access required." });
    }

    req.partnerUniversity = user.university;
    req.partnerUniversityId = user.universityId;
    next();
  } catch (error) {
    next(error);
  }
};

// Get partner dashboard statistics
router.get("/dashboard/stats", requirePartner, async (req: any, res, next) => {
  try {
    const universityId = req.partnerUniversityId;

    const [applications, payments, programs] = await Promise.all([
      prisma.application.count({
        where: { universityId },
      }),
      prisma.payment.count({
        where: {
          application: { universityId },
        },
      }),
      prisma.program.count({
        where: { universityId },
      }),
    ]);

    const totalRevenue = await prisma.payment.aggregate({
      where: {
        application: { universityId },
        paymentStatus: "completed",
      },
      _sum: {
        amount: true,
      },
    });

    res.json({
      applications,
      payments,
      programs,
      totalRevenue: totalRevenue._sum.amount || 0,
    });
  } catch (error) {
    next(error);
  }
});

// Get applications for partner's university
router.get("/applications", requirePartner, async (req: any, res, next) => {
  try {
    const universityId = req.partnerUniversityId;
    const { status, search, page = "1", limit = "10" } = req.query;

    const where: any = { universityId };

    if (status) {
      where.status = status;
    }

    if (req.query.isBlocked !== undefined) {
      where.isBlocked = req.query.isBlocked === "true";
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          program: {
            select: { name: true, slug: true },
          },
          payment: true,
          _count: {
            select: { documents: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.application.count({ where }),
    ]);

    res.json({
      applications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single application
router.get("/applications/:id", requirePartner, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const universityId = req.partnerUniversityId;

    const application = await prisma.application.findFirst({
      where: {
        id,
        universityId,
      },
      include: {
        university: true,
        program: true,
        documents: true,
        payment: true,
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!application) {
      throw new NotFoundError("Application not found");
    }

    res.json(application);
  } catch (error) {
    next(error);
  }
});

// Create new student application (partner can add students)
router.post("/applications", requirePartner, async (req: any, res, next) => {
  try {
    const universityId = req.partnerUniversityId;
    const {
      fullName,
      email,
      phone,
      personalAddress,
      dateOfBirth,
      academicQualification,
      identityNumber,
      country,
      programId,
      additionalServices,
      additionalNotes,
      applicationFee = 100,
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !programId) {
      throw new BadRequestError("Full name, email, and program are required");
    }

    // Verify program belongs to partner's university
    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        universityId,
      },
    });

    if (!program) {
      throw new BadRequestError("Program not found or does not belong to your university");
    }

    const application = await prisma.application.create({
      data: {
        fullName,
        email,
        phone,
        personalAddress,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        academicQualification,
        identityNumber,
        country,
        universityId,
        programId,
        additionalServices: additionalServices || [],
        additionalNotes,
        applicationFee,
        totalFee: applicationFee,
        status: "PENDING",
      },
      include: {
        university: {
          select: { name: true, slug: true },
        },
        program: {
          select: { name: true, slug: true },
        },
      },
    });

    // Create alert for application creation
    await createOperationAlert(
      "create",
      "applications",
      application.fullName,
      application.id,
      req.user?.id,
      universityId,
      {
        email: application.email,
        universityName: application.university?.name,
        programName: application.program?.name,
      }
    );

    res.status(201).json(application);
  } catch (error) {
    next(error);
  }
});

// Update application status
router.patch("/applications/:id/status", requirePartner, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const universityId = req.partnerUniversityId;
    const { status, reason, notes } = req.body;

    const application = await prisma.application.findFirst({
      where: {
        id,
        universityId,
      },
    });

    if (!application) {
      throw new NotFoundError("Application not found");
    }

    const previousStatus = application.status;

    // Update application
    const updated = await prisma.application.update({
      where: { id },
      data: { status },
    });

    // Create status history
    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: id,
        previousStatus,
        newStatus: status,
        changedBy: req.user.id,
        reason,
        notes,
      },
    });

    // Get application details for alert
    const applicationWithDetails = await prisma.application.findUnique({
      where: { id },
      include: {
        university: {
          select: { name: true },
        },
        program: {
          select: { name: true },
        },
      },
    });

    // Create alert for status change
    if (applicationWithDetails) {
      await createStatusChangeAlert(
        "applications",
        applicationWithDetails.fullName,
        applicationWithDetails.id,
        previousStatus,
        status,
        req.user?.id,
        universityId,
        {
          email: applicationWithDetails.email,
          universityName: applicationWithDetails.university?.name,
          programName: applicationWithDetails.program?.name,
          reason,
          notes,
        }
      );
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Update application (student information)
router.put("/applications/:id", requirePartner, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const universityId = req.partnerUniversityId;
    const {
      fullName,
      email,
      phone,
      personalAddress,
      dateOfBirth,
      academicQualification,
      identityNumber,
      country,
      additionalNotes,
      notes,
    } = req.body;

    // Verify application belongs to partner's university
    const application = await prisma.application.findFirst({
      where: {
        id,
        universityId,
      },
    });

    if (!application) {
      throw new NotFoundError("Application not found");
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        ...(fullName && { fullName }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(personalAddress !== undefined && { personalAddress }),
        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(academicQualification !== undefined && { academicQualification }),
        ...(identityNumber !== undefined && { identityNumber }),
        ...(country !== undefined && { country }),
        ...(additionalNotes !== undefined && { additionalNotes }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        program: {
          select: { name: true },
        },
        university: {
          select: { name: true },
        },
      },
    });

    // Create alert for application update
    await createOperationAlert(
      "update",
      "applications",
      updated.fullName,
      updated.id,
      req.user?.id,
      universityId,
      {
        email: updated.email,
        universityName: updated.university?.name,
        programName: updated.program?.name,
      }
    );

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Block/Unblock application (student)
router.patch("/applications/:id/block", requirePartner, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const universityId = req.partnerUniversityId;
    const { isBlocked, blockedReason } = req.body;

    // Verify application belongs to partner's university
    const application = await prisma.application.findFirst({
      where: {
        id,
        universityId,
      },
    });

    if (!application) {
      throw new NotFoundError("Application not found");
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        isBlocked: isBlocked === true || isBlocked === "true",
        blockedReason: blockedReason || null,
        blockedAt: isBlocked === true || isBlocked === "true" ? new Date() : null,
      },
      include: {
        program: {
          select: { name: true },
        },
        university: {
          select: { name: true },
        },
      },
    });

    // Create alert for blocking/unblocking
    await createAlert({
      type: AlertType.UPDATE,
      severity: updated.isBlocked ? AlertSeverity.WARNING : AlertSeverity.SUCCESS,
      title: `Student ${updated.isBlocked ? "Blocked" : "Unblocked"}`,
      message: `${updated.fullName} has been ${updated.isBlocked ? "blocked" : "unblocked"}.${blockedReason ? ` Reason: ${blockedReason}` : ""}`,
      resource: "applications",
      resourceId: updated.id,
      userId: req.user?.id,
      universityId,
      metadata: {
        email: updated.email,
        universityName: updated.university?.name,
        programName: updated.program?.name,
        reason: blockedReason,
        isBlocked: updated.isBlocked,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete application (student)
router.delete("/applications/:id", requirePartner, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const universityId = req.partnerUniversityId;

    // Verify application belongs to partner's university
    const application = await prisma.application.findFirst({
      where: {
        id,
        universityId,
      },
      include: {
        program: {
          select: { name: true },
        },
        university: {
          select: { name: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundError("Application not found");
    }

    // Create alert before deletion
    await createOperationAlert(
      "delete",
      "applications",
      application.fullName,
      application.id,
      req.user?.id,
      universityId,
      {
        email: application.email,
        universityName: application.university?.name,
        programName: application.program?.name,
      }
    );

    // Delete the application (cascade will handle related records)
    await prisma.application.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get payments for partner's university
router.get("/payments", requirePartner, async (req: any, res, next) => {
  try {
    const universityId = req.partnerUniversityId;
    const { status, search, page = "1", limit = "10" } = req.query;

    const where: any = {
      application: { universityId },
    };

    if (status) {
      where.paymentStatus = status;
    }

    if (search) {
      where.OR = [
        { transactionId: { contains: search as string, mode: "insensitive" } },
        {
          application: {
            OR: [
              { fullName: { contains: search as string, mode: "insensitive" } },
              { email: { contains: search as string, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          application: {
            select: {
              id: true,
              fullName: true,
              email: true,
              program: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get programs for partner's university
router.get("/programs", requirePartner, async (req: any, res, next) => {
  try {
    const universityId = req.partnerUniversityId;
    const { search, degree, isActive } = req.query;

    const where: any = { universityId };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { department: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (degree) {
      where.degree = degree;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const programs = await prisma.program.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        degree: true,
        duration: true,
        language: true,
        tuition: true,
        bannerImage: true,
        programImages: true,
        isActive: true,
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(programs);
  } catch (error) {
    next(error);
  }
});

// Get single program for partner's university
router.get("/programs/:id", requirePartner, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const universityId = req.partnerUniversityId;

    const program = await prisma.program.findFirst({
      where: {
        id,
        universityId,
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

// Create new program for partner's university
router.post("/programs", requirePartner, async (req: any, res, next) => {
  try {
    const universityId = req.partnerUniversityId;
    const {
      name,
      slug,
      degree,
      duration,
      language,
      tuition,
      tuitionNotes,
      studyYear,
      lastApplicationDate,
      classSchedule,
      coreSubjects,
      about,
      department,
      programImages,
    } = req.body;

    if (!name || !slug) {
      throw new BadRequestError("Name and slug are required");
    }

    // Check if slug is unique
    const existing = await prisma.program.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new BadRequestError("Program with this slug already exists");
    }

    const program = await prisma.program.create({
      data: {
        name,
        slug,
        degree,
        duration,
        language,
        tuition,
        tuitionNotes,
        studyYear,
        lastApplicationDate,
        classSchedule,
        coreSubjects: coreSubjects || [],
        about,
        department,
        programImages: programImages || [],
        universityId,
        isActive: true,
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
      universityId,
      { degree: program.degree, universityName: program.university.name }
    );

    res.status(201).json(program);
  } catch (error) {
    next(error);
  }
});

// Update program
router.put("/programs/:id", requirePartner, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const universityId = req.partnerUniversityId;

    // Verify program belongs to partner's university
    const program = await prisma.program.findFirst({
      where: {
        id,
        universityId,
      },
    });

    if (!program) {
      throw new NotFoundError("Program not found");
    }

    const updated = await prisma.program.update({
      where: { id },
      data: req.body,
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
      updated.name,
      updated.id,
      req.user?.id,
      universityId,
      { degree: updated.degree, universityName: updated.university.name }
    );

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete program
router.delete("/programs/:id", requirePartner, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const universityId = req.partnerUniversityId;

    // Verify program belongs to partner's university
    const program = await prisma.program.findFirst({
      where: {
        id,
        universityId,
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

    if (!program) {
      throw new NotFoundError("Program not found");
    }

    await prisma.program.delete({
      where: { id },
    });

    // Create alert for program deletion
    await createOperationAlert(
      "delete",
      "programs",
      program.name,
      program.id,
      req.user?.id,
      universityId,
      { degree: program.degree, universityName: program.university.name }
    );

    res.json({ message: "Program deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Get reports data
router.get("/reports", requirePartner, async (req: any, res, next) => {
  try {
    const universityId = req.partnerUniversityId;
    const { dateRange } = req.query;

    // Build date filter
    let dateFilter: any = {};
    if (dateRange === "month") {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfMonth };
    } else if (dateRange === "quarter") {
      const startOfQuarter = new Date();
      const currentMonth = startOfQuarter.getMonth();
      startOfQuarter.setMonth(Math.floor(currentMonth / 3) * 3, 1);
      startOfQuarter.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfQuarter };
    } else if (dateRange === "year") {
      const startOfYear = new Date();
      startOfYear.setMonth(0, 1);
      startOfYear.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfYear };
    }

    // Get statistics
    const [totalApplications, totalPayments, totalPrograms, applicationsByStatus, paymentsByStatus] = await Promise.all([
      prisma.application.count({
        where: {
          universityId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),
      prisma.payment.count({
        where: {
          application: { universityId },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),
      prisma.program.count({
        where: { universityId },
      }),
      prisma.application.groupBy({
        by: ["status"],
        where: {
          universityId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ["paymentStatus"],
        where: {
          application: { universityId },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        _count: true,
      }),
    ]);

    // Calculate total revenue
    const revenueResult = await prisma.payment.aggregate({
      where: {
        application: { universityId },
        paymentStatus: "completed",
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      _sum: {
        amount: true,
      },
    });

    // Get revenue by month (last 12 months)
    const revenueByMonth = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const monthRevenue = await prisma.payment.aggregate({
        where: {
          application: { universityId },
          paymentStatus: "completed",
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      });

      revenueByMonth.push({
        month: date.toLocaleString("default", { month: "long", year: "numeric" }),
        revenue: monthRevenue._sum.amount || 0,
      });
    }

    // Get applications by month (last 12 months)
    const applicationsByMonth = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const monthCount = await prisma.application.count({
        where: {
          universityId,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });

      applicationsByMonth.push({
        month: date.toLocaleString("default", { month: "long", year: "numeric" }),
        count: monthCount,
      });
    }

    // Format applications by status
    const applicationsByStatusFormatted = {
      PENDING: 0,
      REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    applicationsByStatus.forEach((item) => {
      applicationsByStatusFormatted[item.status as keyof typeof applicationsByStatusFormatted] = item._count;
    });

    // Format payments by status
    const paymentsByStatusFormatted = {
      pending: 0,
      completed: 0,
      failed: 0,
    };
    paymentsByStatus.forEach((item) => {
      const status = item.paymentStatus?.toLowerCase() || "pending";
      if (status in paymentsByStatusFormatted) {
        paymentsByStatusFormatted[status as keyof typeof paymentsByStatusFormatted] = item._count;
      }
    });

    res.json({
      totalApplications,
      totalPayments,
      totalRevenue: revenueResult._sum.amount || 0,
      totalPrograms,
      applicationsByStatus: applicationsByStatusFormatted,
      paymentsByStatus: paymentsByStatusFormatted,
      revenueByMonth,
      applicationsByMonth,
    });
  } catch (error) {
    next(error);
  }
});

// Export reports
router.get("/reports/export", requirePartner, async (req: any, res, next) => {
  try {
    const universityId = req.partnerUniversityId;
    const { format, dateRange } = req.query;

    // Build date filter (same as reports endpoint)
    let dateFilter: any = {};
    if (dateRange === "month") {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfMonth };
    } else if (dateRange === "quarter") {
      const startOfQuarter = new Date();
      const currentMonth = startOfQuarter.getMonth();
      startOfQuarter.setMonth(Math.floor(currentMonth / 3) * 3, 1);
      startOfQuarter.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfQuarter };
    } else if (dateRange === "year") {
      const startOfYear = new Date();
      startOfYear.setMonth(0, 1);
      startOfYear.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfYear };
    }

    // Get all data for export
    const [applications, payments, programs] = await Promise.all([
      prisma.application.findMany({
        where: {
          universityId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        include: {
          program: {
            select: { name: true },
          },
          payment: {
            select: {
              amount: true,
              paymentStatus: true,
              paymentMethod: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({
        where: {
          application: { universityId },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        include: {
          application: {
            select: {
              fullName: true,
              email: true,
              program: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.program.findMany({
        where: { universityId },
        include: {
          _count: {
            select: { applications: true },
          },
        },
      }),
    ]);

    if (format === "csv") {
      // Generate CSV
      const csvRows: string[] = [];
      
      // Header
      csvRows.push("University Report");
      csvRows.push(`Generated: ${new Date().toLocaleString()}`);
      csvRows.push("");
      
      // Summary
      csvRows.push("SUMMARY");
      csvRows.push("Metric,Value");
      csvRows.push(`Total Applications,${applications.length}`);
      csvRows.push(`Total Payments,${payments.length}`);
      csvRows.push(`Total Revenue,${payments.filter(p => p.paymentStatus === "completed").reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}`);
      csvRows.push(`Total Programs,${programs.length}`);
      csvRows.push("");
      
      // Applications
      csvRows.push("APPLICATIONS");
      csvRows.push("Name,Email,Program,Status,Application Fee,Payment Status,Created At");
      applications.forEach((app) => {
        csvRows.push(
          `"${app.fullName}","${app.email}","${app.program?.name || "N/A"}","${app.status}","${app.applicationFee || 0}","${app.payment?.paymentStatus || "N/A"}","${new Date(app.createdAt).toLocaleString()}"`
        );
      });
      csvRows.push("");
      
      // Payments
      csvRows.push("PAYMENTS");
      csvRows.push("Student Name,Email,Program,Amount,Status,Method,Transaction ID,Date");
      payments.forEach((payment) => {
        csvRows.push(
          `"${payment.application.fullName}","${payment.application.email}","${payment.application.program?.name || "N/A"}","${payment.amount}","${payment.paymentStatus}","${payment.paymentMethod}","${payment.transactionId || "N/A"}","${new Date(payment.createdAt).toLocaleString()}"`
        );
      });
      csvRows.push("");
      
      // Programs
      csvRows.push("PROGRAMS");
      csvRows.push("Program Name,Degree,Duration,Language,Tuition,Applications");
      programs.forEach((program) => {
        csvRows.push(
          `"${program.name}","${program.degree || "N/A"}","${program.duration || "N/A"}","${program.language || "N/A"}","${program.tuition || "N/A"}","${program._count.applications}"`
        );
      });

      const csvContent = csvRows.join("\n");
      const csvBuffer = Buffer.from(csvContent, "utf-8");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="university-report-${new Date().toISOString().split("T")[0]}.csv"`);
      res.send(csvBuffer);
    } else if (format === "pdf") {
      // For PDF, we'll return a simple HTML that can be printed
      // In production, you might want to use a library like puppeteer or pdfkit
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>University Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #121c67; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #5260ce; color: white; }
            .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>University Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          
          <div class="summary">
            <h2>Summary</h2>
            <p>Total Applications: ${applications.length}</p>
            <p>Total Payments: ${payments.length}</p>
            <p>Total Revenue: $${payments.filter(p => p.paymentStatus === "completed").reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}</p>
            <p>Total Programs: ${programs.length}</p>
          </div>
          
          <h2>Applications</h2>
          <table>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Program</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
            ${applications.map(app => `
              <tr>
                <td>${app.fullName}</td>
                <td>${app.email}</td>
                <td>${app.program?.name || "N/A"}</td>
                <td>${app.status}</td>
                <td>${new Date(app.createdAt).toLocaleDateString()}</td>
              </tr>
            `).join("")}
          </table>
          
          <h2>Payments</h2>
          <table>
            <tr>
              <th>Student</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
            ${payments.map(payment => `
              <tr>
                <td>${payment.application.fullName}</td>
                <td>$${Number(payment.amount).toFixed(2)}</td>
                <td>${payment.paymentStatus}</td>
                <td>${new Date(payment.createdAt).toLocaleDateString()}</td>
              </tr>
            `).join("")}
          </table>
        </body>
        </html>
      `;

      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", `attachment; filename="university-report-${new Date().toISOString().split("T")[0]}.html"`);
      res.send(html);
    } else {
      throw new BadRequestError("Invalid format. Use 'csv' or 'pdf'");
    }
  } catch (error) {
    next(error);
  }
});

// Get partner's university profile
router.get("/university", requirePartner, async (req: any, res, next) => {
  try {
    const universityId = req.partnerUniversityId;
    
    const university = await prisma.university.findUnique({
      where: { id: universityId },
    });

    if (!university) {
      throw new NotFoundError("University not found");
    }

    res.json(university);
  } catch (error) {
    next(error);
  }
});

// Update partner's university profile
router.put("/university", requirePartner, async (req: any, res, next) => {
  try {
    const universityId = req.partnerUniversityId;
    const data = req.body;

    // Only allow updating specific fields (exclude sensitive fields like isActive)
    const allowedFields = [
      "name",
      "slug",
      "country",
      "city",
      "language",
      "description",
      "about",
      "website",
      "logoUrl",
      "bannerUrl",
      "establishmentYear",
      "worldRanking",
      "localRanking",
      "studentsNumber",
      "admissionRequirements",
      "services",
      "tourImages",
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    // Validate slug if provided
    if (updateData.slug) {
      const existing = await prisma.university.findFirst({
        where: {
          slug: updateData.slug,
          id: { not: universityId },
        },
      });

      if (existing) {
        throw new BadRequestError("University slug must be unique");
      }
    }

    const university = await prisma.university.update({
      where: { id: universityId },
      data: updateData,
    });

    // Create alert for university update
    await createOperationAlert(
      "update",
      "universities",
      university.name,
      university.id,
      req.user?.id,
      universityId,
      { country: university.country, city: university.city }
    );

    res.json(university);
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      next(error);
      return;
    }
    next(error);
  }
});

// Mount university entities routes (departments, semesters, educational years, degrees)
// These routes are already protected by requireAuth in partner router
router.use("/", universityEntitiesRouter);

export default router;



