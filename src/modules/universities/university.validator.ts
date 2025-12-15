import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url()
  .or(z.string().trim().length(0))
  .optional()
  .transform((value) => (value ? value : undefined));

export const createUniversitySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  slug: z.string().trim().min(1, "Slug is required"),
  country: z.string().trim().min(1, "Country is required"),
  city: z.string().trim().min(1, "City is required"),
  language: z.string().trim().min(1, "Language is required"),
  description: z.string().trim().optional(),
  about: z.string().trim().optional(),
  website: optionalUrl,
  logoUrl: optionalUrl,
  bannerUrl: optionalUrl,
  establishmentYear: z.number().int().positive().optional(),
  worldRanking: z.number().int().positive().optional(),
  localRanking: z.number().int().positive().optional(),
  studentsNumber: z.string().trim().optional(),
  admissionRequirements: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  tourImages: z.array(z.string()).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateUniversitySchema = createUniversitySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

export type CreateUniversityInput = z.infer<typeof createUniversitySchema>;
export type UpdateUniversityInput = z.infer<typeof updateUniversitySchema>;


