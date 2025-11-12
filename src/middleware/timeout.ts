import { Request, Response, NextFunction } from 'express';
import { TimeoutError } from '../errors';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { tempFileManager } from '../utils/tempFileManager';

/**
 * Timeout middleware
 * Applies a configurable timeout to all requests to prevent them from hanging indefinitely
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const timeout = (req: Request, res: Response, next: NextFunction): void => {
    const timeoutMs = env.REQUEST_TIMEOUT_MS;
    const requestId = (req as any).requestId;

    // Set up timeout
    const timeoutHandle = setTimeout(async () => {
        // Check if response has already been sent
        if (res.headersSent) {
            return;
        }

        // Log timeout event with operation details
        logger.warn('Request timeout exceeded', {
            requestId,
            method: req.method,
            path: req.path,
            timeout: timeoutMs,
            ip: req.ip,
        });

        // Cleanup temp files
        try {
            await tempFileManager.cleanup();
        } catch (cleanupError) {
            logger.error('Failed to cleanup temp files during timeout', {
                requestId,
                error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
            });
        }

        // Pass timeout error to error handler
        next(new TimeoutError(`Request exceeded timeout of ${timeoutMs}ms`));
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => {
        clearTimeout(timeoutHandle);
    });

    // Clear timeout when response closes (e.g., client disconnects)
    res.on('close', () => {
        clearTimeout(timeoutHandle);
    });

    next();
};
