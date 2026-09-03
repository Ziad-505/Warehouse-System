import { z } from "zod";

// The same Zod you use on requests, pointed at configuration. A missing
// JWT_SECRET should stop the process at boot with a clear message -- not throw
// on the first login attempt, in production, at 3am.
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    // Comma-separated list of allowed origins, or "*" to allow any.
    CORS_ORIGIN: z.string().default("*"),
    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default("info"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    const problems = result.error.issues
        .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
    console.error(`Invalid environment configuration:\n${problems}`);
    throw new Error("Invalid environment configuration");
}

export const env = result.data;
