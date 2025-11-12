import express from "express";
import path from "path";

// Services
import { resizeImage } from "../services/resizeImage";

// Utils
import { tempFileManager } from "../utils/tempFileManager";
import upload from "../utils/upload";
import { OUTPUT_DIR } from "../utils/coreFolders";
import { sendImageResponse } from "../utils/imageResponse";
import { isValidDimension } from "../utils/validators";

// Errors
import { ValidationError } from "../errors";

const router = express.Router();

/**
 * @swagger
 * /api/resize-image:
 *   post:
 *     summary: Resize images to specified dimensions
 *     description: Resizes one or multiple images to the specified width and/or height. Maintains aspect ratio if only one dimension is provided.
 *     tags:
 *       - Image Processing
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Images to resize (max 10 files, 50MB each)
 *               width:
 *                 type: integer
 *                 minimum: 1
 *                 description: Target width in pixels (optional if height is provided)
 *                 example: 800
 *               height:
 *                 type: integer
 *                 minimum: 1
 *                 description: Target height in pixels (optional if width is provided)
 *                 example: 600
 *               zip:
 *                 type: string
 *                 enum: ['true', 'false']
 *                 description: Whether to return images as a ZIP file
 *                 default: 'false'
 *     responses:
 *       200:
 *         description: Successfully resized image(s)
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request - missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               noFiles:
 *                 value:
 *                   error: "No files uploaded"
 *               noDimensions:
 *                 value:
 *                   error: "Width or height required"
 *               invalidDimensions:
 *                 value:
 *                   error: "Width and height must be valid positive numbers"
 *       500:
 *         description: Internal server error during resizing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", upload.array("images"), async (req, res, next) => {
    try {
        if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
            throw new ValidationError("No files uploaded");
        }

        const { width, height, zip } = req.body;

        if (!width && !height) {
            throw new ValidationError("Width or height required");
        }

        if (!isValidDimension(width) || !isValidDimension(height)) {
            throw new ValidationError("Width and height must be valid positive numbers");
        }

        const parsedWidth = width ? parseInt(width) : undefined;
        const parsedHeight = height ? parseInt(height) : undefined;

        // Register all uploaded files for cleanup immediately
        const requestId = (req as any).requestId;
        req.files.forEach(file => tempFileManager.add(file.path, requestId));

        const outputFiles: string[] = [];

        for (const [index, file] of req.files.entries()) {
            const ext = path.extname(file.originalname) || ".jpg";
            const outputImagePath = path.join(OUTPUT_DIR, `image-${index + 1}${ext}`);

            await resizeImage(file.path, outputImagePath, {
                width: parsedWidth,
                height: parsedHeight,
            });

            outputFiles.push(outputImagePath);
            tempFileManager.add(outputImagePath, requestId);
        }

        await sendImageResponse(res, outputFiles, zip === "true");
    } catch (err) {
        next(err);
    }
});

export default router;
