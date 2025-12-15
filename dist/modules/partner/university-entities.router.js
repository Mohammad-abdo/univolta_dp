import { Router } from "express";
import prisma from "../../config/prisma.js";
import { NotFoundError, BadRequestError } from "../../common/errors/AppError.js";
const router = Router();
// Middleware to check if user is a university partner (assumes requireAuth is already applied)
const requirePartner = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { university: true },
        });
        if (!user || !user.universityId) {
            return res.status(403).json({ error: "Access denied. University partner access required." });
        }
        req.partnerUniversityId = user.universityId;
        next();
    }
    catch (error) {
        next(error);
    }
};
// ==================== DEPARTMENTS ====================
// Get all departments for partner's university
router.get("/departments", requirePartner, async (req, res, next) => {
    try {
        const departments = await prisma.department.findMany({
            where: { universityId: req.partnerUniversityId },
            orderBy: { name: "asc" },
        });
        res.json(departments);
    }
    catch (error) {
        next(error);
    }
});
// Create department
router.post("/departments", requirePartner, async (req, res, next) => {
    try {
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            throw new BadRequestError("Department name is required");
        }
        // Check if department with same name already exists
        const existing = await prisma.department.findFirst({
            where: {
                universityId: req.partnerUniversityId,
                name: name.trim(),
            },
        });
        if (existing) {
            throw new BadRequestError("Department with this name already exists");
        }
        const department = await prisma.department.create({
            data: {
                universityId: req.partnerUniversityId,
                name: name.trim(),
                description: description?.trim() || null,
                isActive: true,
            },
        });
        res.status(201).json(department);
    }
    catch (error) {
        next(error);
    }
});
// Update department
router.put("/departments/:id", requirePartner, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;
        // Verify department belongs to partner's university
        const existing = await prisma.department.findFirst({
            where: {
                id,
                universityId: req.partnerUniversityId,
            },
        });
        if (!existing) {
            throw new NotFoundError("Department not found");
        }
        // Check name uniqueness if name is being changed
        if (name && name.trim() !== existing.name) {
            const nameExists = await prisma.department.findFirst({
                where: {
                    universityId: req.partnerUniversityId,
                    name: name.trim(),
                    id: { not: id },
                },
            });
            if (nameExists) {
                throw new BadRequestError("Department with this name already exists");
            }
        }
        const department = await prisma.department.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        res.json(department);
    }
    catch (error) {
        next(error);
    }
});
// Delete department
router.delete("/departments/:id", requirePartner, async (req, res, next) => {
    try {
        const { id } = req.params;
        // Verify department belongs to partner's university
        const department = await prisma.department.findFirst({
            where: {
                id,
                universityId: req.partnerUniversityId,
            },
            include: {
                programs: true,
            },
        });
        if (!department) {
            throw new NotFoundError("Department not found");
        }
        // Check if department is used in programs
        if (department.programs.length > 0) {
            throw new BadRequestError("Cannot delete department that is used in programs");
        }
        await prisma.department.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
// ==================== SEMESTERS ====================
// Get all semesters for partner's university
router.get("/semesters", requirePartner, async (req, res, next) => {
    try {
        const semesters = await prisma.semester.findMany({
            where: { universityId: req.partnerUniversityId },
            orderBy: { startDate: "desc" },
        });
        res.json(semesters);
    }
    catch (error) {
        next(error);
    }
});
// Create semester
router.post("/semesters", requirePartner, async (req, res, next) => {
    try {
        const { name, startDate, endDate } = req.body;
        if (!name || !name.trim()) {
            throw new BadRequestError("Semester name is required");
        }
        const semester = await prisma.semester.create({
            data: {
                universityId: req.partnerUniversityId,
                name: name.trim(),
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                isActive: true,
            },
        });
        res.status(201).json(semester);
    }
    catch (error) {
        next(error);
    }
});
// Update semester
router.put("/semesters/:id", requirePartner, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, startDate, endDate, isActive } = req.body;
        // Verify semester belongs to partner's university
        const existing = await prisma.semester.findFirst({
            where: {
                id,
                universityId: req.partnerUniversityId,
            },
        });
        if (!existing) {
            throw new NotFoundError("Semester not found");
        }
        const semester = await prisma.semester.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        res.json(semester);
    }
    catch (error) {
        next(error);
    }
});
// Delete semester
router.delete("/semesters/:id", requirePartner, async (req, res, next) => {
    try {
        const { id } = req.params;
        // Verify semester belongs to partner's university
        const semester = await prisma.semester.findFirst({
            where: {
                id,
                universityId: req.partnerUniversityId,
            },
        });
        if (!semester) {
            throw new NotFoundError("Semester not found");
        }
        await prisma.semester.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
// ==================== EDUCATIONAL YEARS ====================
// Get all educational years for partner's university
router.get("/educational-years", requirePartner, async (req, res, next) => {
    try {
        const educationalYears = await prisma.educationalYear.findMany({
            where: { universityId: req.partnerUniversityId },
            orderBy: { yearNumber: "asc" },
        });
        res.json(educationalYears);
    }
    catch (error) {
        next(error);
    }
});
// Create educational year
router.post("/educational-years", requirePartner, async (req, res, next) => {
    try {
        const { name, yearNumber, description } = req.body;
        if (!name || !name.trim()) {
            throw new BadRequestError("Educational year name is required");
        }
        // Check if educational year with same name already exists
        const existing = await prisma.educationalYear.findFirst({
            where: {
                universityId: req.partnerUniversityId,
                name: name.trim(),
            },
        });
        if (existing) {
            throw new BadRequestError("Educational year with this name already exists");
        }
        const educationalYear = await prisma.educationalYear.create({
            data: {
                universityId: req.partnerUniversityId,
                name: name.trim(),
                yearNumber: yearNumber ? parseInt(yearNumber) : null,
                description: description?.trim() || null,
                isActive: true,
            },
        });
        res.status(201).json(educationalYear);
    }
    catch (error) {
        next(error);
    }
});
// Update educational year
router.put("/educational-years/:id", requirePartner, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, yearNumber, description, isActive } = req.body;
        // Verify educational year belongs to partner's university
        const existing = await prisma.educationalYear.findFirst({
            where: {
                id,
                universityId: req.partnerUniversityId,
            },
        });
        if (!existing) {
            throw new NotFoundError("Educational year not found");
        }
        // Check name uniqueness if name is being changed
        if (name && name.trim() !== existing.name) {
            const nameExists = await prisma.educationalYear.findFirst({
                where: {
                    universityId: req.partnerUniversityId,
                    name: name.trim(),
                    id: { not: id },
                },
            });
            if (nameExists) {
                throw new BadRequestError("Educational year with this name already exists");
            }
        }
        const educationalYear = await prisma.educationalYear.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(yearNumber !== undefined && { yearNumber: yearNumber ? parseInt(yearNumber) : null }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        res.json(educationalYear);
    }
    catch (error) {
        next(error);
    }
});
// Delete educational year
router.delete("/educational-years/:id", requirePartner, async (req, res, next) => {
    try {
        const { id } = req.params;
        // Verify educational year belongs to partner's university
        const educationalYear = await prisma.educationalYear.findFirst({
            where: {
                id,
                universityId: req.partnerUniversityId,
            },
            include: {
                programs: true,
            },
        });
        if (!educationalYear) {
            throw new NotFoundError("Educational year not found");
        }
        // Check if educational year is used in programs
        if (educationalYear.programs.length > 0) {
            throw new BadRequestError("Cannot delete educational year that is used in programs");
        }
        await prisma.educationalYear.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
// ==================== DEGREES ====================
// Get all degrees for partner's university
router.get("/degrees", requirePartner, async (req, res, next) => {
    try {
        const degrees = await prisma.degree.findMany({
            where: { universityId: req.partnerUniversityId },
            orderBy: { name: "asc" },
        });
        res.json(degrees);
    }
    catch (error) {
        next(error);
    }
});
// Create degree
router.post("/degrees", requirePartner, async (req, res, next) => {
    try {
        const { name, abbreviation, description } = req.body;
        if (!name || !name.trim()) {
            throw new BadRequestError("Degree name is required");
        }
        // Check if degree with same name already exists
        const existing = await prisma.degree.findFirst({
            where: {
                universityId: req.partnerUniversityId,
                name: name.trim(),
            },
        });
        if (existing) {
            throw new BadRequestError("Degree with this name already exists");
        }
        const degree = await prisma.degree.create({
            data: {
                universityId: req.partnerUniversityId,
                name: name.trim(),
                abbreviation: abbreviation?.trim() || null,
                description: description?.trim() || null,
                isActive: true,
            },
        });
        res.status(201).json(degree);
    }
    catch (error) {
        next(error);
    }
});
// Update degree
router.put("/degrees/:id", requirePartner, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, abbreviation, description, isActive } = req.body;
        // Verify degree belongs to partner's university
        const existing = await prisma.degree.findFirst({
            where: {
                id,
                universityId: req.partnerUniversityId,
            },
        });
        if (!existing) {
            throw new NotFoundError("Degree not found");
        }
        // Check name uniqueness if name is being changed
        if (name && name.trim() !== existing.name) {
            const nameExists = await prisma.degree.findFirst({
                where: {
                    universityId: req.partnerUniversityId,
                    name: name.trim(),
                    id: { not: id },
                },
            });
            if (nameExists) {
                throw new BadRequestError("Degree with this name already exists");
            }
        }
        const degree = await prisma.degree.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(abbreviation !== undefined && { abbreviation: abbreviation?.trim() || null }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        res.json(degree);
    }
    catch (error) {
        next(error);
    }
});
// Delete degree
router.delete("/degrees/:id", requirePartner, async (req, res, next) => {
    try {
        const { id } = req.params;
        // Verify degree belongs to partner's university
        const degree = await prisma.degree.findFirst({
            where: {
                id,
                universityId: req.partnerUniversityId,
            },
            include: {
                programs: true,
            },
        });
        if (!degree) {
            throw new NotFoundError("Degree not found");
        }
        // Check if degree is used in programs
        if (degree.programs.length > 0) {
            throw new BadRequestError("Cannot delete degree that is used in programs");
        }
        await prisma.degree.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=university-entities.router.js.map