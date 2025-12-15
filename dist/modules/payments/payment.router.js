import { Router } from "express";
import prisma from "../../config/prisma.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { NotFoundError, BadRequestError } from "../../common/errors/AppError.js";
import { z } from "zod";
const router = Router();
const paymentMethodSchema = z.enum(["credit_card", "paypal"]);
const processPaymentSchema = z.object({
    paymentMethod: paymentMethodSchema,
    // Credit card fields
    cardNumber: z.string().trim().optional(),
    cardholderName: z.string().trim().optional(),
    expiryDate: z.string().trim().optional(),
    cvv: z.string().trim().optional(),
    // PayPal fields
    paypalEmail: z.string().email().optional(),
    // Payment details
    amount: z.number().positive(),
    currency: z.string().default("USD"),
});
// Process payment for application
router.post("/:applicationId/process", async (req, res, next) => {
    try {
        const { applicationId } = req.params;
        const input = processPaymentSchema.parse(req.body);
        // Get application
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: { program: true, university: true },
        });
        if (!application) {
            throw new NotFoundError("Application not found");
        }
        // Validate payment method specific fields
        if (input.paymentMethod === "credit_card") {
            if (!input.cardNumber || !input.cardholderName || !input.expiryDate || !input.cvv) {
                throw new BadRequestError("Credit card details are required");
            }
        }
        else if (input.paymentMethod === "paypal") {
            if (!input.paypalEmail) {
                throw new BadRequestError("PayPal email is required");
            }
        }
        // Calculate fees if not set
        const applicationFee = application.applicationFee || 100; // Default $100
        const additionalFee = application.additionalFee || 0;
        const totalFee = application.totalFee || (applicationFee + additionalFee);
        // Create or update payment
        const payment = await prisma.payment.upsert({
            where: { applicationId },
            update: {
                amount: totalFee,
                currency: input.currency,
                paymentMethod: input.paymentMethod,
                paymentStatus: "pending", // In real app, this would be set after payment gateway confirmation
                paymentDetails: {
                    ...(input.paymentMethod === "credit_card" && {
                        cardNumber: input.cardNumber?.slice(-4), // Only store last 4 digits
                        cardholderName: input.cardholderName,
                        expiryDate: input.expiryDate,
                    }),
                    ...(input.paymentMethod === "paypal" && {
                        paypalEmail: input.paypalEmail,
                    }),
                },
            },
            create: {
                applicationId,
                amount: totalFee,
                currency: input.currency,
                paymentMethod: input.paymentMethod,
                paymentStatus: "pending",
                paymentDetails: {
                    ...(input.paymentMethod === "credit_card" && {
                        cardNumber: input.cardNumber?.slice(-4),
                        cardholderName: input.cardholderName,
                        expiryDate: input.expiryDate,
                    }),
                    ...(input.paymentMethod === "paypal" && {
                        paypalEmail: input.paypalEmail,
                    }),
                },
            },
        });
        // Update application payment info
        await prisma.application.update({
            where: { id: applicationId },
            data: {
                paymentMethod: input.paymentMethod,
                paymentStatus: "pending",
                paymentDetails: payment.paymentDetails,
                applicationFee: applicationFee,
                additionalFee: additionalFee,
                totalFee: totalFee,
            },
        });
        // TODO: In production, integrate with payment gateway (Stripe, PayPal)
        // For now, we'll simulate successful payment
        // In real implementation, you would:
        // 1. Send payment to gateway
        // 2. Wait for confirmation
        // 3. Update payment status to "completed" or "failed"
        res.json({
            payment,
            message: "Payment processed successfully",
            // In production, return gateway response
        });
    }
    catch (error) {
        next(error);
    }
});
// Get payment status
router.get("/:applicationId", async (req, res, next) => {
    try {
        const { applicationId } = req.params;
        const payment = await prisma.payment.findUnique({
            where: { applicationId },
            include: {
                application: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        program: {
                            select: {
                                name: true,
                                university: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!payment) {
            throw new NotFoundError("Payment not found");
        }
        res.json(payment);
    }
    catch (error) {
        next(error);
    }
});
// Update payment status (for admin/webhook)
router.put("/:applicationId/status", requireAuth, async (req, res, next) => {
    try {
        const { applicationId } = req.params;
        const { status, transactionId } = z.object({
            status: z.enum(["pending", "completed", "failed", "refunded"]),
            transactionId: z.string().optional(),
        }).parse(req.body);
        const payment = await prisma.payment.update({
            where: { applicationId },
            data: {
                paymentStatus: status,
                transactionId: transactionId || undefined,
                paidAt: status === "completed" ? new Date() : undefined,
            },
        });
        // Update application payment status
        await prisma.application.update({
            where: { id: applicationId },
            data: {
                paymentStatus: status,
            },
        });
        res.json(payment);
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=payment.router.js.map