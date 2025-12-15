import { Router } from "express";
import prisma from "../../config/prisma.js";
import { requireAuth } from "../../common/middleware/auth.js";
import { BadRequestError } from "../../common/errors/AppError.js";
import { z } from "zod";

const router = Router();

router.use(requireAuth);

// Get all alerts for the current user
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const universityId = req.user?.universityId;

    if (!userId) {
      throw new BadRequestError("User not authenticated");
    }

    const { page = "1", limit = "50", unreadOnly = "false" } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    const onlyUnread = unreadOnly === "true";

    // Build where clause based on user role
    const where: any = {};

    if (userRole === "university" && universityId) {
      // University partners see alerts for their university
      where.universityId = universityId;
    } else if (userRole === "admin" || userRole === "editor") {
      // Admins and editors see all alerts (no filter)
    } else {
      // Regular users see only their own alerts
      where.userId = userId;
    }

    if (onlyUnread) {
      where.isRead = false;
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          university: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.alert.count({ where }),
    ]);

    res.json({
      alerts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get unread alerts count
router.get("/unread/count", async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const universityId = req.user?.universityId;

    if (!userId) {
      throw new BadRequestError("User not authenticated");
    }

    const where: any = {
      isRead: false,
    };

    if (userRole === "university" && universityId) {
      where.universityId = universityId;
    } else if (userRole === "admin" || userRole === "editor") {
      // Admins and editors see all unread alerts
    } else {
      where.userId = userId;
    }

    const count = await prisma.alert.count({ where });

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// Mark alert as read
router.patch("/:id/read", async (req, res, next) => {
  try {
    const alertId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User not authenticated");
    }

    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new BadRequestError("Alert not found");
    }

    // Check if user has permission to read this alert
    const userRole = req.user?.role;
    const universityId = req.user?.universityId;

    let hasPermission = false;
    if (userRole === "admin" || userRole === "editor") {
      hasPermission = true;
    } else if (userRole === "university" && universityId && alert.universityId === universityId) {
      hasPermission = true;
    } else if (alert.userId === userId) {
      hasPermission = true;
    }

    if (!hasPermission) {
      throw new BadRequestError("You don't have permission to access this alert");
    }

    const updatedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: { isRead: true },
    });

    res.json(updatedAlert);
  } catch (error) {
    next(error);
  }
});

// Mark all alerts as read
router.patch("/read-all", async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const universityId = req.user?.universityId;

    if (!userId) {
      throw new BadRequestError("User not authenticated");
    }

    const where: any = {
      isRead: false,
    };

    if (userRole === "university" && universityId) {
      where.universityId = universityId;
    } else if (userRole === "admin" || userRole === "editor") {
      // Admins and editors can mark all alerts as read
    } else {
      where.userId = userId;
    }

    const result = await prisma.alert.updateMany({
      where,
      data: { isRead: true },
    });

    res.json({ count: result.count });
  } catch (error) {
    next(error);
  }
});

// Delete alert
router.delete("/:id", async (req, res, next) => {
  try {
    const alertId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User not authenticated");
    }

    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new BadRequestError("Alert not found");
    }

    // Check if user has permission to delete this alert
    const userRole = req.user?.role;
    const universityId = req.user?.universityId;

    let hasPermission = false;
    if (userRole === "admin" || userRole === "editor") {
      hasPermission = true;
    } else if (userRole === "university" && universityId && alert.universityId === universityId) {
      hasPermission = true;
    } else if (alert.userId === userId) {
      hasPermission = true;
    }

    if (!hasPermission) {
      throw new BadRequestError("You don't have permission to delete this alert");
    }

    await prisma.alert.delete({
      where: { id: alertId },
    });

    res.json({ message: "Alert deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;

