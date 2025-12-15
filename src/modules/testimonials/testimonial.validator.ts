import { z } from "zod";

export const createTestimonialSchema = z.object({
  author: z.string().trim().min(1, "Author is required"),
  role: z.string().trim().optional(),
  title: z.string().trim().optional(),
  content: z.string().trim().min(1, "Content is required"),
  rating: z.number().int().min(1).max(5).optional(),
  isPublished: z.boolean().optional().default(true),
  universityId: z.string().trim().optional(),
});

export const updateTestimonialSchema = createTestimonialSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

export const listTestimonialsQuerySchema = z.object({
  universityId: z.string().trim().optional(),
  isPublished: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return val === "true";
    }),
});

export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;
export type UpdateTestimonialInput = z.infer<typeof updateTestimonialSchema>;
export type ListTestimonialsQuery = z.infer<typeof listTestimonialsQuerySchema>;


