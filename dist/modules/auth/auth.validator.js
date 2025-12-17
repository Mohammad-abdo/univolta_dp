import { z } from "zod";
export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
});
export const signupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().optional(),
});
export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});
export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});
export const universitySignupSchema = z.object({
    // University information
    universityName: z.string().min(2, "University name must be at least 2 characters"),
    country: z.string().min(1, "Country is required"),
    city: z.string().min(1, "City is required"),
    language: z.string().min(1, "Language is required"),
    website: z.string().url().optional().or(z.literal("")),
    description: z.string().optional(),
    // Admin user information
    adminName: z.string().min(2, "Admin name must be at least 2 characters"),
    adminEmail: z.string().email("Invalid email address"),
    adminPassword: z.string().min(6, "Password must be at least 6 characters"),
    adminPhone: z.string().optional(),
});
//# sourceMappingURL=auth.validator.js.map