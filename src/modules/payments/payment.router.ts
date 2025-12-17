import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../../config/prisma.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { NotFoundError, BadRequestError } from "../../common/errors/AppError.js";
import { z } from "zod";

const router = Router();

// Ensure uploads directory exists for invoices
const invoicesDir = path.join(process.cwd(), "uploads", "invoices");
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

// Configure multer storage for invoices
const invoiceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, invoicesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `invoice-${uniqueSuffix}${ext}`);
  },
});

// File filter for invoices (PDF, images, documents)
const invoiceFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || 
    file.mimetype === "application/pdf" || 
    file.mimetype === "application/msword" || 
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only PDF, Word documents, and image files are allowed"));
  }
};

const invoiceUpload = multer({
  storage: invoiceStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: invoiceFileFilter,
});

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
    } else if (input.paymentMethod === "paypal") {
      if (!input.paypalEmail) {
        throw new BadRequestError("PayPal email is required");
      }
    }

    // Calculate fees if not set
    const applicationFee = Number(application.applicationFee) || 100; // Default $100
    const additionalFee = Number(application.additionalFee) || 0;
    const totalFee = Number(application.totalFee) || (applicationFee + additionalFee);

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

    // TODO: In production, integrate with payment gateway (Stripe, PayPal)
    // For now, we'll simulate successful payment
    // In real implementation, you would:
    // 1. Send payment to gateway
    // 2. Wait for confirmation
    // 3. Update payment status to "completed" or "failed"
    
    // For development/testing: Auto-complete payment
    // In production, this should be done via webhook after gateway confirmation
    const finalPaymentStatus = "paid"; // Changed from "pending" to "paid" for successful payment
    
    // Update payment status to completed
    const completedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: "completed",
        paidAt: new Date(),
      },
    });

    // Update application payment info with completed status
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        paymentMethod: input.paymentMethod,
        paymentStatus: finalPaymentStatus, // "paid" for application
        paymentDetails: payment.paymentDetails as any,
        applicationFee: applicationFee,
        additionalFee: additionalFee,
        totalFee: totalFee,
      },
    });

    res.json({
      payment: completedPayment,
      message: "Payment processed successfully",
      // In production, return gateway response
    });
  } catch (error) {
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
  } catch (error) {
    next(error);
  }
});

// Update payment status (for admin/webhook)
router.put("/:applicationId/status", requireAuth, async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { status, transactionId } = z.object({
      status: z.enum(["pending", "completed", "failed", "refunded", "blocked"]),
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
  } catch (error) {
    next(error);
  }
});

// Upload invoice for payment (student can upload after payment)
router.post(
  "/:applicationId/invoice",
  requireAuth,
  invoiceUpload.single("invoice"),
  async (req, res, next) => {
    try {
      const { applicationId } = req.params;
      const userId = (req as any).user?.id;

      if (!req.file) {
        throw new BadRequestError("No invoice file uploaded");
      }

      // Get payment
      const payment = await prisma.payment.findUnique({
        where: { applicationId },
        include: {
          application: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundError("Payment not found");
      }

      // Check if user owns this application (student) or is admin
      const isOwner = payment.application.userId === userId;
      const isAdmin = (req as any).user?.role === "admin";

      if (!isOwner && !isAdmin) {
        throw new BadRequestError("You don't have permission to upload invoice for this payment");
      }

      // Update payment with invoice
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          invoiceUrl: `/uploads/invoices/${req.file.filename}`,
          invoiceFileName: req.file.originalname,
        },
      });

      res.json({
        payment: updatedPayment,
        message: "Invoice uploaded successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get invoice download URL (admin and student who owns the application)
router.get("/:applicationId/invoice", requireAuth, async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const userId = (req as any).user?.id;

    const payment = await prisma.payment.findUnique({
      where: { applicationId },
      include: {
        application: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    if (!payment.invoiceUrl) {
      throw new NotFoundError("No invoice uploaded for this payment");
    }

    // Check if user owns this application (student) or is admin
    const isOwner = payment.application.userId === userId;
    const isAdmin = (req as any).user?.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new BadRequestError("You don't have permission to view this invoice");
    }

    res.json({
      invoiceUrl: payment.invoiceUrl,
      invoiceFileName: payment.invoiceFileName,
    });
  } catch (error) {
    next(error);
  }
});

export default router;




