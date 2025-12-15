import { z } from "zod";
const statusEnum = z.enum(["PENDING", "REVIEW", "APPROVED", "REJECTED"]);
export const createApplicationSchema = z.object({
    fullName: z.string().trim().min(1, "Full name is required"),
    email: z.string().trim().email("Valid email is required"),
    phone: z.string().trim().optional(),
    personalAddress: z.string().trim().optional(),
    dateOfBirth: z.string().optional().transform((val) => val ? new Date(val) : undefined),
    academicQualification: z.string().trim().optional(),
    identityNumber: z.string().trim().optional(),
    country: z.string().trim().optional(),
    additionalServices: z.array(z.string()).optional(),
    additionalNotes: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    universityId: z.string().trim().optional(),
    programId: z.string().trim().optional(),
    applicationFee: z.number().optional(),
    additionalFee: z.number().optional(),
    totalFee: z.number().optional(),
    status: statusEnum.optional(),
});
export const updateApplicationSchema = createApplicationSchema.partial().refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export const updateApplicationStatusSchema = z.object({
    status: statusEnum,
    reason: z.string().trim().optional(),
    notes: z.string().trim().optional(),
});
export const listApplicationsQuerySchema = z.object({
    status: statusEnum.optional(),
    search: z.string().trim().optional(),
});
//# sourceMappingURL=application.validator.js.map