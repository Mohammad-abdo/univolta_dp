import { Router } from "express";
import prisma from "../../config/prisma.js";
import { createFaqSchema, listFaqQuerySchema, updateFaqSchema } from "./faq.validator.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { requirePermission } from "../../common/middleware/permissions.js";
import { BadRequestError, NotFoundError } from "../../common/errors/AppError.js";
import { Prisma } from "@prisma/client";
import { createOperationAlert } from "../alerts/alert.service.js";
const router = Router();
router.get("/", async (req, res, next) => {
    try {
        const query = listFaqQuerySchema.parse(req.query);
        const faqs = await prisma.faq.findMany({
            where: {
                category: query.category,
                isPublished: query.isPublished ?? undefined,
            },
            orderBy: [
                { sortOrder: "asc" },
                { createdAt: "asc" },
            ],
        });
        res.json(faqs);
    }
    catch (error) {
        next(error);
    }
});
router.use(requireAuth);
router.get("/:id", requirePermission("faqs", "read"), async (req, res, next) => {
    try {
        const faq = await prisma.faq.findUnique({
            where: { id: req.params.id },
        });
        if (!faq) {
            throw new NotFoundError("FAQ not found");
        }
        res.json(faq);
    }
    catch (error) {
        next(error);
    }
});
router.post("/", requirePermission("faqs", "create"), async (req, res, next) => {
    try {
        const input = createFaqSchema.parse(req.body);
        const faq = await prisma.faq.create({
            data: {
                question: input.question,
                answer: input.answer,
                category: input.category,
                isPublished: input.isPublished ?? true,
                sortOrder: input.sortOrder ?? 0,
            },
        });
        // Create alert for FAQ creation
        await createOperationAlert("create", "faqs", faq.question.substring(0, 50) + (faq.question.length > 50 ? "..." : ""), faq.id, req.user?.id, undefined, { category: faq.category });
        res.status(201).json(faq);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            next(new BadRequestError("Duplicate FAQ"));
            return;
        }
        next(error);
    }
});
router.put("/:id", requirePermission("faqs", "update"), async (req, res, next) => {
    try {
        const input = updateFaqSchema.parse(req.body);
        const faq = await prisma.faq.update({
            where: { id: req.params.id },
            data: input,
        });
        // Create alert for FAQ update
        await createOperationAlert("update", "faqs", faq.question.substring(0, 50) + (faq.question.length > 50 ? "..." : ""), faq.id, req.user?.id, undefined, { category: faq.category });
        res.json(faq);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            next(new NotFoundError("FAQ not found"));
            return;
        }
        next(error);
    }
});
router.delete("/:id", requirePermission("faqs", "delete"), async (req, res, next) => {
    try {
        // Get FAQ info before deletion for alert
        const faq = await prisma.faq.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                question: true,
                category: true,
            },
        });
        if (!faq) {
            throw new NotFoundError("FAQ not found");
        }
        await prisma.faq.delete({
            where: { id: req.params.id },
        });
        // Create alert for FAQ deletion
        await createOperationAlert("delete", "faqs", faq.question.substring(0, 50) + (faq.question.length > 50 ? "..." : ""), faq.id, req.user?.id, undefined, { category: faq.category });
        res.status(204).send();
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            next(new NotFoundError("FAQ not found"));
            return;
        }
        next(error);
    }
});
export default router;
//# sourceMappingURL=faq.router.js.map