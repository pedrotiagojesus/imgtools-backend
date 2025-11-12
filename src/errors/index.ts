/**
 * Custom error classes for the API
 * These errors provide structured error handling with appropriate HTTP status codes
 */

/**
 * Base error class for all application errors
 * Extends the native Error class with additional properties for HTTP responses
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);

        // Set the prototype explicitly to ensure instanceof works correctly
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * ValidationError - Used when request data fails validation
 * Returns 400 Bad Request
 */
export class ValidationError extends AppError {
    public readonly details?: Record<string, unknown>;

    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 400, true);
        this.details = details;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * NotFoundError - Used when a requested resource is not found
 * Returns 404 Not Found
 */
export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404, true);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * TimeoutError - Used when an operation exceeds the allowed time limit
 * Returns 408 Request Timeout
 */
export class TimeoutError extends AppError {
    constructor(message: string = 'Request timeout') {
        super(message, 408, true);
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}

/**
 * InsufficientStorageError - Used when disk space is insufficient
 * Returns 507 Insufficient Storage
 */
export class InsufficientStorageError extends AppError {
    constructor(message: string = 'Insufficient storage space') {
        super(message, 507, true);
        Object.setPrototypeOf(this, InsufficientStorageError.prototype);
    }
}
