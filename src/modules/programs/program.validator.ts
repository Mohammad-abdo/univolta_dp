import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url()
  .or(z.string().trim().length(0))
  .optional()
  .transform((value) => (value ? value : undefined));

export const createProgramSchema = z.object({
  universityId: z.string().trim().min(1, "University is required"),
  name: z.string().trim().min(1, "Name is required"),
  slug: z.string().trim().min(1, "Slug is required"),
  degree: z.string().trim().optional(),
  duration: z.string().trim().optional(),
  language: z.string().trim().optional(),
  tuition: z.string().trim().optional(),
  tuitionNotes: z.string().trim().optional(),
  studyYear: z.number().int().positive().optional(),
  lastApplicationDate: z.string().trim().optional(),
  classSchedule: z.string().trim().optional(),
  studyMethod: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  coreSubjects: z.array(z.string()).optional(),
  about: z.string().trim().optional(),
  department: z.string().trim().optional(),
  programImages: z.array(z.string()).optional(),
  bannerImage: optionalUrl,
  isActive: z.boolean().optional().default(true),
});

export const updateProgramSchema = createProgramSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

export const listProgramsQuerySchema = z.object({
  universityId: z.string().trim().optional(),
  degree: z.string().trim().optional(),
  department: z.string().trim().optional(),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type ListProgramsQuery = z.infer<typeof listProgramsQuerySchema>;


