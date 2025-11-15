import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { env } from '../config/env';
import { ValidationError } from '../errors';
import { UPLOADS_DIR } from '../utils/directories';

/**
 * Whitelist of allowed MIME types for image uploads
 * Only common image formats are permitted
 */
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
];

/**
 * Whitelist of allowed file extensions
 * Used as a secondary check alongside MIME type validation
 */
const ALLOWED_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.bmp',
    '.tiff',
    '.tif',
    '.svg',
];

/**
 * Custom file filter for multer that validates MIME types and extensions
 * Rejects files that don't match the whitelist
 */
const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        const error = new ValidationError(
            `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
            {
                mimetype: file.mimetype,
                allowedTypes: ALLOWED_MIME_TYPES
            }
        );
        return cb(error as any);
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        const error = new ValidationError(
            `Invalid file extension: ${ext}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
            {
                extension: ext,
                allowedExtensions: ALLOWED_EXTENSIONS
            }
        );
        return cb(error as any);
    }

    // File is valid
    cb(null, true);
};

/**
 * Multer storage configuration with unique filename generation
 * Prevents filename collisions by using UUIDs
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: uuid + original extension
        const ext = path.extname(file.originalname);
        const uniqueName = `${uuidv4()}${ext}`;
        cb(null, uniqueName);
    },
});

/**
 * Configured multer instance with validation and limits
 * - File size limit from environment (default 50MB)
 * - Max files per request from environment (default 10)
 * - MIME type and extension validation
 * - Unique filename generation
 */
export const uploadValidator = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
        files: env.MAX_FILES_PER_REQUEST,
    },
});

/**
 * Error handler for multer errors
 * Converts multer errors into ValidationError instances with descriptive messages
 */
export const handleUploadError = (err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
        // Handle multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError(
                `File too large. Maximum size: ${env.MAX_FILE_SIZE_MB}MB`,
                { maxSize: env.MAX_FILE_SIZE_MB, code: err.code }
            ));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new ValidationError(
                `Too many files. Maximum: ${env.MAX_FILES_PER_REQUEST} files per request`,
                { maxFiles: env.MAX_FILES_PER_REQUEST, code: err.code }
            ));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ValidationError(
                `Unexpected field name: ${err.field}`,
                { field: err.field, code: err.code }
            ));
        }
        // Generic multer error
        return next(new ValidationError(
            `Upload error: ${err.message}`,
            { code: err.code }
        ));
    }

    // Pass through other errors (including ValidationError from fileFilter)
    next(err);
};
