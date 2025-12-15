import { Router } from "express";
import prisma from "../../config/prisma.js";
import { createApplicationSchema, listApplicationsQuerySchema, updateApplicationSchema, updateApplicationStatusSchema, } from "./application.validator.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { requirePermission } from "../../common/middleware/permissions.js";
import { BadRequestError, NotFoundError } from "../../common/errors/AppError.js";
import { Prisma } from "@prisma/client";
import { createOperationAlert, createStatusChangeAlert } from "../alerts/alert.service.js";
const router = Router();
// Public route - anyone can create an application
router.post("/", async (req, res, next) => {
    try {
        const input = createApplicationSchema.parse(req.body);
        const application = await prisma.application.create({
            data: {
                fullName: input.fullName,
                email: input.email,
                phone: input.phone,
                personalAddress: input.personalAddress,
                dateOfBirth: input.dateOfBirth,
                academicQualification: input.academicQualification,
                identityNumber: input.identityNumber,
                country: input.country,
                additionalServices: input.additionalServices,
                additionalNotes: input.additionalNotes,
                notes: input.notes,
                status: input.status || "PENDING",
                universityId: input.universityId,
                programId: input.programId,
                userId: req.user?.id,
                applicationFee: input.applicationFee,
                additionalFee: input.additionalFee,
                totalFee: input.totalFee || (input.applicationFee || 0) + (input.additionalFee || 0),
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
        res.status(201).json(application);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            next(new BadRequestError("Invalid university or program selection"));
            return;
        }
        next(error);
    }
});
// Public route - get application by ID (for success page)
router.get("/:id/public", async (req, res, next) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                fullName: true,
                email: true,
                university: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                program: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                totalFee: true,
                paymentStatus: true,
                status: true,
                createdAt: true,
            },
        });
        if (!application) {
            return res.status(404).json({ error: "Application not found" });
        }
        res.json(application);
    }
    catch (error) {
        next(error);
    }
});
// Public route - allow updating application (for multi-step form)
router.put("/:id", async (req, res, next) => {
    try {
        const data = updateApplicationSchema.parse(req.body);
        const application = await prisma.application.update({
            where: { id: req.params.id },
            data: {
                ...data,
                totalFee: data.totalFee || (data.applicationFee || 0) + (data.additionalFee || 0),
            },
        });
        res.json(application);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            next(new NotFoundError("Application not found"));
            return;
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            next(new BadRequestError("Invalid university or program selection"));
            return;
        }
        next(error);
    }
});
// Protected routes - require authentication
router.use(requireAuth);
router.get("/", requirePermission("applications", "read"), async (req, res, next) => {
    try {
        const query = listApplicationsQuerySchema.parse(req.query);
        // Regular users can only see their own applications
        const where = {};
        // Add status filter if provided
        if (query.status) {
            where.status = query.status;
        }
        // Add search condition if provided (MySQL doesn't support mode: "insensitive", but MySQL is case-insensitive by default with utf8mb4_unicode_ci collation)
        if (query.search) {
            where.OR = [
                { fullName: { contains: query.search } },
                { email: { contains: query.search } },
            ];
        }
        // If user is not admin/editor, only show their own applications
        if (req.user && req.user.role !== "admin" && req.user.role !== "editor") {
            where.userId = req.user.id;
        }
        const applications = await prisma.application.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                university: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                program: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        res.json(applications);
    }
    catch (error) {
        console.error("Error fetching applications:", error);
        next(error);
    }
});
router.get("/:id", requirePermission("applications", "read"), async (req, res, next) => {
    try {
        const application = await prisma.application.findUnique({
            where: { id: req.params.id },
            include: {
                university: true,
                program: true,
                documents: {
                    orderBy: { uploadedAt: "desc" },
                },
                payment: true,
                statusHistory: {
                    orderBy: { createdAt: "desc" },
                    include: {
                    // We'll add user relation if needed
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (!application) {
            throw new NotFoundError("Application not found");
        }
        // Regular users can only see their own applications
        if (req.user && req.user.role !== "admin" && req.user.role !== "editor") {
            if (application.userId !== req.user.id) {
                throw new NotFoundError("Application not found");
            }
        }
        res.json(application);
    }
    catch (error) {
        next(error);
    }
});
router.patch("/:id/status", requirePermission("applications", "update"), async (req, res, next) => {
    try {
        const input = updateApplicationStatusSchema.parse(req.body);
        const { status, reason, notes } = input;
        // Get current application to track status change
        const currentApplication = await prisma.application.findUnique({
            where: { id: req.params.id },
            select: { status: true },
        });
        if (!currentApplication) {
            throw new NotFoundError("Application not found");
        }
        // Update application status
        const application = await prisma.application.update({
            where: { id: req.params.id },
            data: { status },
            include: {
                university: true,
                program: true,
                documents: {
                    orderBy: { uploadedAt: "desc" },
                },
                payment: true,
                statusHistory: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
            },
        });
        // Create status history record
        await prisma.applicationStatusHistory.create({
            data: {
                applicationId: req.params.id,
                previousStatus: currentApplication.status,
                newStatus: status,
                changedBy: req.user?.id,
                reason: reason || undefined,
                notes: notes || undefined,
            },
        });
        // Create alert for status change
        await createStatusChangeAlert("applications", application.fullName, application.id, currentApplication.status, status, req.user?.id, application.universityId, {
            email: application.email,
            universityName: application.university?.name,
            programName: application.program?.name,
            reason,
            notes,
        });
        res.json(application);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            next(new NotFoundError("Application not found"));
            return;
        }
        next(error);
    }
});
router.delete("/:id", requirePermission("applications", "delete"), async (req, res, next) => {
    try {
        // Get application info before deletion for alert
        const application = await prisma.application.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                fullName: true,
                email: true,
                universityId: true,
            },
        });
        if (!application) {
            throw new NotFoundError("Application not found");
        }
        await prisma.application.delete({
            where: { id: req.params.id },
        });
        // Create alert for application deletion
        await createOperationAlert("delete", "applications", application.fullName, application.id, req.user?.id, application.universityId, { email: application.email });
        res.status(204).send();
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            next(new NotFoundError("Application not found"));
            return;
        }
        next(error);
    }
});
export default router;
//# sourceMappingURL=application.router.js.map