/**
 * API response types
 */

/**
 * Standard error response
 */
export interface ErrorResponse {
    error: string;
    statusCode: number;
    requestId: string;
    details?: Record<string, any>;
}

/**
 * Base64 encoded file response
 */
export interface Base64FileResponse {
    filename: string;
    mimeType: string;
    data: string;
}

/**
 * Multiple files response
 */
export interface FilesResponse {
    files: Base64FileResponse[];
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime: number;
    checks: {
        filesystem: {
            status: 'pass' | 'fail';
            uploadsWritable: boolean;
            outputWritable: boolean;
            message?: string;
        };
        memory: {
            status: 'pass' | 'fail';
            usagePercent: number;
            message?: string;
        };
    };
}
