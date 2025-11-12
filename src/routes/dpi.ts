import express from "express";
import path from "path";

// Services
import { dpiAjust } from "../services/dpiAjust";

// Utils
import { tempFileManager } from "../utils/tempFileManager";
import upload from "../utils/upload";
import { OUTPUT_DIR } from "../utils/coreFolders";
import { sendImageResponse } from "../utils/imageResponse";
import { isValidDPI } from "../utils/validators";

// Errors
import { ValidationError } from "../errors";

const router = express.Router();

/**
 * @swagger
 * /api/ajust-dpi:
 *   post:
 *     summary: Adjust DPI (dots per inch) of images
 *     description: Adjusts the DPI metadata of one or multiple images to the specified value without changing image dimensions.
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
 *               - dpi
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Images to adjust DPI (max 10 files, 50MB each)
 *               dpi:
 *                 type: integer
 *                 minimum: 72
 *                 maximum: 2400
 *                 description: Target DPI value
 *                 example: 300
 *               zip:
 *                 type: string
 *                 enum: ['true', 'false']
 *                 description: Whether to return images as a ZIP file
 *                 default: 'false'
 *     responses:
 *       200:
 *         description: Successfully adjusted DPI of image(s)
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
 *               invalidDPI:
 *                 value:
 *                   error: "Invalid DPI value"
 *       500:
 *         description: Internal server error during DPI adjustment
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

        const { dpi, zip } = req.body;

        if (!isValidDPI(dpi)) {
            throw new ValidationError("Invalid DPI value");
        }

        const dpiValue = parseInt(dpi);

        // Register all uploaded files for cleanup immediately
        const requestId = (req as any).requestId;
        req.files.forEach(file => tempFileManager.add(file.path, requestId));

        const outputFiles: string[] = [];

        for (const [index, file] of req.files.entries()) {
            const ext = path.extname(file.originalname) || ".jpg";
            const outputImagePath = path.join(OUTPUT_DIR, `image-${index + 1}${ext}`);

            await dpiAjust(file.path, outputImagePath, { dpi: dpiValue });

            outputFiles.push(outputImagePath);
            tempFileManager.add(outputImagePath, requestId);
        }

        await sendImageResponse(res, outputFiles, zip === "true");
    } catch (err) {
        next(err);
    }
});

export default router;
