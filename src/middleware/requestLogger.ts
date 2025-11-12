import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';

// Extend Express Request type to include requestId
declare global {
    namespace Express {
        interface Request {
            requestId?: string;
            startTime?: number;
        }
    }
}

/**
 * Request logger middleware
 * Logs all incoming requests with method, path, IP, user agent, and duration
 * Attaches a unique request ID to each request for tracking
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    // Generate unique request ID
    req.requestId = uuidv4();
    req.startTime = Date.now();

    // Extract request information
    const { method, path, ip } = req;
    const userAgent = req.get('user-agent') || 'unknown';

    // Log request start
    logger.info('Request started', {
        requestId: req.requestId,
        method,
        path,
        ip,
        userAgent
    });

    // Capture response finish event to log completion
    const originalSend = res.send;
    res.send = function (data: any): Response {
        // Calculate request duration
        const duration = Date.now() - (req.startTime || Date.now());

        // Log request completion
        logger.info('Request completed', {
            requestId: req.requestId,
            method,
            path,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });

        // Call original send method
        return originalSend.call(this, data);
    };

    next();
};
