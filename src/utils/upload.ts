import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { UPLOADS_DIR } from "./coreFolders";
import { uploadValidator, handleUploadError } from "../middleware/uploadValidator";
import { tempFileManager } from "./tempFileManager";

// Ensure upload directory exists at startup
if (!fs.existsSync(UPLOADS_DIR)) {
    throw new Error(`Upload directory does not exist: ${UPLOADS_DIR}`);
}

/**
 * Validated upload middleware with automatic temp file tracking
 * This replaces the basic multer configuration with enhanced security:
 * - MIME type validation
 * - File size limits
 * - Max files per request limits
 * - Unique filename generation
 * - Automatic temp file tracking for cleanup
 */
export const upload = uploadValidator;

/**
 * Middleware to track uploaded files for cleanup
 * Should be used after upload middleware to register files with tempFileManager
 */
export const trackUploadedFiles = (req: Request, _res: Response, next: NextFunction) => {
    try {
        // Track single file upload
        if (req.file) {
            tempFileManager.add(req.file.path);
        }

        // Track multiple file uploads
        if (req.files) {
            if (Array.isArray(req.files)) {
                // files is an array
                req.files.forEach(file => {
                    tempFileManager.add(file.path);
                });
            } else {
                // files is an object with field names as keys
                Object.values(req.files).forEach(fileArray => {
                    if (Array.isArray(fileArray)) {
                        fileArray.forEach(file => {
                            tempFileManager.add(file.path);
                        });
                    }
                });
            }
        }

        next();
    } catch (error) {
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