import express from "express";
import path from "path";
import fs from "fs";

// Services
import { convertRaster } from "../services/convertRaster";
import { convertVectorize } from "../services/convertVectorize";

// Utils
import { tempFileManager } from "../utils/tempFileManager";
import upload from "../utils/upload";
import { OUTPUT_DIR } from "../utils/coreFolders";
import { sendImageResponse } from "../utils/imageResponse";
import { isValidFormat, isVectorizable } from "../utils/validators";

// Errors
import { ValidationError } from "../errors";

const router = express.Router();

/**
 * @swagger
 * /api/convert-image:
 *   post:
 *     summary: Convert images to different formats
 *     description: Converts one or multiple images to a specified format. Supports raster formats (jpg, png, webp, etc.) and vectorization to SVG.
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
 *               - format
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Images to convert (max 10 files, 50MB each)
 *               format:
 *                 type: string
 *                 enum: [jpg, jpeg, png, webp, tiff, bmp, svg]
 *                 description: Target format for conversion
 *               zip:
 *                 type: string
 *                 enum: ['true', 'false']
 *                 description: Whether to return images as a ZIP file
 *                 default: 'false'
 *     responses:
 *       200:
 *         description: Successfully converted image(s)
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
 *         description: Bad request - missing parameters or invalid format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               noFormat:
 *                 value:
 *                   error: "Formato de saída não especificado."
 *               noImages:
 *                 value:
 *                   error: "Nenhuma imagem enviada."
 *               invalidFormat:
 *                 value:
 *                   error: "Formato inválido."
 *       500:
 *         description: Internal server error during conversion
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", upload.array("images"), async (req, res, next) => {
    try {
        const { format, zip } = req.body;

        if (!format) {
            throw new ValidationError("Formato de saída não especificado.");
        }

        if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
            throw new ValidationError("Nenhuma imagem enviada.");
        }

        if (!isValidFormat(format)) {
            throw new ValidationError("Formato inválido.");
        }

        // Register all uploaded files for cleanup immediately
        const requestId = (req as any).requestId;
        req.files.forEach(file => tempFileManager.add(file.path, requestId));

        const outputFiles: string[] = [];

        for (const [index, file] of req.files.entries()) {
            const baseName = `image-${index + 1}.${format}`;
            const outputPath = path.join(OUTPUT_DIR, baseName);

            if (format === "svg") {
                if (!isVectorizable(file.mimetype)) {
                    continue;
                }

                const svg = await convertVectorize(file.path, {
                    resize: { width: 800, height: 600 },
                    backgroundColor: "#ffffff",
                    threshold: 180,
                });

                await fs.promises.writeFile(outputPath, svg, "utf-8");
            } else {
                await convertRaster(file.path, outputPath, format as any);
            }

            outputFiles.push(outputPath);
            tempFileManager.add(outputPath, requestId);
        }

        await sendImageResponse(res, outputFiles, zip === "true");
    } catch (err) {
        next(err);
    }
});

export default router;
