import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';
import { tempFileManager } from '../utils/tempFileManager';

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
 * Automatically cleans up temp files after request completion
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

    // Cleanup temp files when response closes (after streaming completes)
    // Using 'close' instead of 'finish' to ensure streaming operations complete first
    res.on('close', async () => {
        try {
            // Add a small delay to ensure all file operations are complete
            await new Promise(resolve => setTimeout(resolve, 100));

            const filesCount = tempFileManager.getTrackedCountByRequestId(req.requestId!);
            if (filesCount > 0) {
                const cleaned = await tempFileManager.cleanupByRequestId(req.requestId!);
                logger.debug('Temp files cleaned after request', {
                    requestId: req.requestId,
                    filesCount: cleaned
                });
            }
        } catch (error) {
            logger.error('Error cleaning temp files after request', {
                requestId: req.requestId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
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
