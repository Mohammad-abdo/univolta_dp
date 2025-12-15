import { config } from "dotenv";
import { z } from "zod";
config();
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    JWT_ACCESS_EXPIRES: z.string().default("15m"),
    JWT_REFRESH_EXPIRES: z.string().default("7d"),
    CORS_ALLOWED_ORIGINS: z
        .string()
        .transform((val) => val.split(",").map((origin) => origin.trim()))
        .default("http://localhost:3000,http://localhost:5173"),
});
const env = envSchema.parse(process.env);
export default env;
//# sourceMappingURL=env.js.map