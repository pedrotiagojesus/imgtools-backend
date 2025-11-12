import { z } from 'zod';

const envSchema = z.object({
    // Basic Configuration
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('4000').transform(Number).pipe(z.number().min(1).max(65535)),
    CORS_ORIGIN: z.string().default('*').transform(s => s.split(',')),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number).pipe(z.number().positive()), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number).pipe(z.number().positive()),

    // File Upload
    MAX_FILE_SIZE_MB: z.string().default('50').transform(Number).pipe(z.number().positive()),
    MAX_FILES_PER_REQUEST: z.string().default('10').transform(Number).pipe(z.number().positive()),

    // Timeouts
    REQUEST_TIMEOUT_MS: z.string().default('30000').transform(Number).pipe(z.number().positive()), // 30 seconds
    IMAGE_PROCESSING_TIMEOUT_MS: z.string().default('25000').transform(Number).pipe(z.number().positive()), // 25 seconds

    // Logging
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FORMAT: z.enum(['json', 'simple']).default('simple'),

    // Cleanup
    TEMP_FILE_MAX_AGE_MS: z.string().default('3600000').transform(Number).pipe(z.number().positive()), // 1 hour
    CLEANUP_INTERVAL_MS: z.string().default('300000').transform(Number).pipe(z.number().positive()), // 5 minutes
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
    try {
        const parsed = envSchema.parse(process.env);
        return parsed;
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('❌ Invalid environment configuration:');
            error.issues.forEach((err) => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
            process.exit(1);
        }
        throw error;
    }
}

export const env = validateEnv();
