import { z } from "zod";
export const createFaqSchema = z.object({
    question: z.string().trim().min(1, "Question is required"),
    answer: z.string().trim().min(1, "Answer is required"),
    category: z.string().trim().optional(),
    isPublished: z.boolean().optional().default(true),
    sortOrder: z.number().int().optional(),
});
export const updateFaqSchema = createFaqSchema.partial().refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export const listFaqQuerySchema = z.object({
    category: z.string().trim().optional(),
    isPublished: z
        .string()
        .optional()
        .transform((val) => {
        if (val === undefined)
            return undefined;
        return val === "true";
    }),
});
//# sourceMappingURL=faq.validator.js.map