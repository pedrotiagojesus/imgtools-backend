import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Rate limiter middleware to prevent abuse of API resources
 * Limits requests per IP address based on configured window and max requests
 */
export const rateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers

    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response) => {
        const requestId = (req as any).id || 'unknown';
        const ip = req.ip || req.socket.remoteAddress || 'unknown';

        // Log rate limit violation
        logger.warn('Rate limit exceeded', {
            requestId,
            ip,
            path: req.path,
            method: req.method,
            userAgent: req.get('user-agent')
        });

        // Return 429 with descriptive error message
        res.status(429).json({
            error: 'Too Many Requests',
            message: `You have exceeded the ${env.RATE_LIMIT_MAX_REQUESTS} requests in ${env.RATE_LIMIT_WINDOW_MS / 1000 / 60} minutes limit. Please try again later.`,
            requestId,
            retryAfter: res.getHeader('Retry-After')
        });
    },

    // Skip rate limiting for successful requests (only count towards limit)
    skip: () => false,

    // Key generator - use IP address
    keyGenerator: (req: Request) => {
        return req.ip || req.socket.remoteAddress || 'unknown';
    }
});
