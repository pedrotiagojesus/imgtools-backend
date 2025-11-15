import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { UPLOADS_DIR } from "./directories";
import { uploadValidator, handleUploadError } from "../middleware/uploadValidator";
import { tempFileManager } from "./tempFileManager";
import { logger } from "../config/logger";

// Ensure upload directory exists at startup
if (!fs.existsSync(UPLOADS_DIR)) {
    throw new Error(`Upload directory does not exist: ${UPLOADS_DIR}`);
}

/**
 * Validated upload middleware with enhanced security features:
 * - MIME type validation
 * - File size limits
 * - Max files per request limits
 * - Unique filename generation
 *
 * Note: Files are NOT automatically tracked for cleanup.
 * Routes should register files with tempFileManager using the requestId.
 *
 * @example
 * // In routes, after upload:
 * req.files.forEach(file => tempFileManager.add(file.path, requestId));
 */
export const upload = uploadValidator;

/**
 * Middleware to track uploaded files for cleanup
 * Registers files with tempFileManager using the request ID for proper cleanup.
 * Should be used after upload middleware if automatic tracking is desired.
 *
 * @example
 * router.post('/', upload.array('images'), trackUploadedFiles, async (req, res) => {
 *   // Files are now tracked automatically
 * });
 */
export const trackUploadedFiles = (req: Request, _res: Response, next: NextFunction) => {
    try {
        const requestId = (req as any).requestId;

        // Track single file upload
        if (req.file) {
            tempFileManager.add(req.file.path, requestId);
            logger.debug('Single file tracked for cleanup', {
                requestId,
                filePath: req.file.path,
                filename: req.file.originalname
            });
        }

        // Track multiple file uploads
        if (req.files) {
            if (Array.isArray(req.files)) {
                // files is an array
                req.files.forEach(file => {
                    tempFileManager.add(file.path, requestId);
                });
                logger.debug('Multiple files tracked for cleanup', {
                    requestId,
                    count: req.files.length
                });
            } else {
                // files is an object with field names as keys
                let totalFiles = 0;
                Object.values(req.files).forEach(fileArray => {
                    if (Array.isArray(fileArray)) {
                        fileArray.forEach(file => {
                            tempFileManager.add(file.path, requestId);
                            totalFiles++;
                        });
                    }
                });
                logger.debug('Multiple files tracked for cleanup', {
                    requestId,
                    count: totalFiles
                });
            }
        }

        next();
    } catch (error) {
        logger.error('Error tracking uploaded files', {
            requestId: (req as any).requestId,
            error: error instanceof Error ? error.message : String(error)
        });
        next(error);
    }
};

/**
 * Export the upload error handler for use in routes
 */
export { handleUploadError };

/**
 * Default export for backward compatibility
 */
export default upload;