import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../../config/prisma.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { NotFoundError, BadRequestError } from "../../common/errors/AppError.js";
import { z } from "zod";

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads", "documents");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === "application/pdf" || file.mimetype === "application/msword" || file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, DOCX, and image files are allowed"));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter,
});

const documentTypeSchema = z.enum([
  "high_school_card",
  "language_proof",
  "passport",
  "other"
]);

// Upload document for application (public - allows anonymous registration)
router.post(
  "/:applicationId/documents",
  upload.single("document"),
  async (req, res, next) => {
    try {
      const { applicationId } = req.params;
      const documentType = documentTypeSchema.parse(req.body.documentType);

      if (!req.file) {
        throw new BadRequestError("No file uploaded");
      }

      // Check if application exists
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new NotFoundError("Application not found");
      }

      // Allow document upload for any application (no auth required for registration flow)

      // Create document record
      const document = await prisma.applicationDocument.create({
        data: {
          applicationId,
          documentType,
          fileName: req.file.originalname,
          fileUrl: `/uploads/documents/${req.file.filename}`,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        },
      });

      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  }
);

// Get application documents
router.get("/:applicationId/documents", requireAuth, async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundError("Application not found");
    }

    const documents = await prisma.applicationDocument.findMany({
      where: { applicationId },
      orderBy: { uploadedAt: "desc" },
    });

    res.json(documents);
  } catch (error) {
    next(error);
  }
});

// Delete document
router.delete("/:applicationId/documents/:documentId", requireAuth, async (req, res, next) => {
  try {
    const { applicationId, documentId } = req.params;

    const document = await prisma.applicationDocument.findUnique({
      where: { id: documentId },
    });

    if (!document || document.applicationId !== applicationId) {
      throw new NotFoundError("Document not found");
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), document.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.applicationDocument.delete({
      where: { id: documentId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;


