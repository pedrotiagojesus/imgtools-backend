import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../errors';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { tempFileManager } from '../utils/tempFileManager';

/**
 * Interface for error response structure
 */
interface ErrorResponse {
    status: 'error';
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
    stack?: string;
}

/**
 * Global error handler middleware
 * Catches all errors, logs them, cleans up resources, and sends formatted responses
 *
 * @param err - The error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const errorHandler = async (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    // Extract request ID if available (will be added by request logger middleware)
    const requestId = (req as any).requestId;

    // Determine if this is an operational error
    const isOperational = err instanceof AppError && err.isOperational;
    const statusCode = err instanceof AppError ? err.statusCode : 500;

    // Log error with full context
    const errorContext = {
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        statusCode,
        isOperational,
        stack: err.stack,
    };

    if (statusCode >= 500) {
        logger.error(`Server error: ${err.message}`, errorContext);
    } else {
        logger.warn(`Client error: ${err.message}`, errorContext);
    }

    // Cleanup temp files for this specific request on error
    if (requestId) {
        try {
            const cleaned = await tempFileManager.cleanupByRequestId(requestId);
            if (cleaned > 0) {
                logger.debug('Temp files cleaned after error', {
                    requestId,
                    filesCount: cleaned
                });
            }
        } catch (cleanupError) {
            logger.error('Failed to cleanup temp files during error handling', {
                requestId,
                error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
            });
        }
    }

    // Build error response
    const errorResponse: ErrorResponse = {
        status: 'error',
        message: err.message || 'An unexpected error occurred',
        requestId,
    };

    // Include validation details if available
    if (err instanceof ValidationError && err.details) {
        errorResponse.details = err.details;
    }

    // In development, include stack trace for debugging
    // In production, hide internal details for security
    if (env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    } else if (!isOperational) {
        // For non-operational errors in production, use generic message
        errorResponse.message = 'An internal server error occurred';
    }

    // Send response
    res.status(statusCode).json(errorResponse);
};
