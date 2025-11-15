import { Request } from 'express';

/**
 * Extended Express Request with custom properties
 */
export interface AppRequest extends Request {
    /**
     * Unique request ID for tracking and logging
     */
    requestId: string;
}

/**
 * Request with validated body
 */
export interface ValidatedRequest<T> extends AppRequest {
    body: T;
}
