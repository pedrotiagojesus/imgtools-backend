import express from "express";
import fs from "fs";
import path from "path";

// Services
import { createPdf } from "../services/createPdf";

// Utils
import { tempFileManager } from "../utils/tempFileManager";
import upload from "../utils/upload";
import { OUTPUT_DIR } from "../utils/coreFolders";

// Errors
import { ValidationError } from "../errors";

const router = express.Router();

/**
 * @swagger
 * /api/pdf-from-images:
 *   post:
 *     summary: Create PDF from images
 *     description: Creates a single PDF document from one or multiple images (PNG, JPG, JPEG). Images are added in the order they are uploaded.
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
 *                 description: Images to include in PDF (PNG/JPG only, max 10 files, 50MB each)
 *               pdfTitle:
 *                 type: string
 *                 description: PDF document title metadata
 *                 example: "My Image Collection"
 *               pdfAuthor:
 *                 type: string
 *                 description: PDF document author metadata
 *                 example: "John Doe"
 *               pdfSubject:
 *                 type: string
 *                 description: PDF document subject metadata
 *                 example: "Image compilation"
 *               pdfCreator:
 *                 type: string
 *                 description: PDF document creator metadata
 *                 example: "ImgTools Backend"
 *     responses:
 *       200:
 *         description: Successfully created PDF from images
 *         headers:
 *           Content-Type:
 *             schema:
 *               type: string
 *               example: application/pdf
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: 'attachment; filename="images.pdf"'
 *           X-Filename:
 *             schema:
 *               type: string
 *               example: images.pdf
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request - missing files or unsupported format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               noFiles:
 *                 value:
 *                   error: "No files uploaded"
 *               unsupportedFormat:
 *                 value:
 *                   error: "Formatos não suportados: file.bmp. Apenas PNG e JPG são permitidos."
 *       500:
 *         description: Internal server error during PDF creation
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

        const { pdfTitle, pdfAuthor, pdfSubject, pdfCreator } = req.body;
        const pdfFilename = "images.pdf";
        const pdfPath = path.join(OUTPUT_DIR, pdfFilename);

        const validExtensions = [".png", ".jpg", ".jpeg"];

        const invalidFiles = req.files.filter((file) => {
            const ext = path.extname(file.originalname).toLowerCase();
            return !validExtensions.includes(ext);
        });

        if (invalidFiles.length > 0) {
            const names = invalidFiles.map((f) => f.originalname).join(", ");
            throw new ValidationError(
                `Formatos não suportados: ${names}. Apenas PNG e JPG são permitidos.`
            );
        }

        // Register all uploaded files for cleanup immediately
        const requestId = (req as any).requestId;
        const imagePaths: string[] = [];

        req.files.forEach((file) => {
            imagePaths.push(file.path);
            tempFileManager.add(file.path, requestId);
        });

        await createPdf(imagePaths, pdfPath, pdfTitle, pdfAuthor, pdfSubject, pdfCreator);

        // Register output PDF for cleanup
        tempFileManager.add(pdfPath, requestId);

        const pdfBuffer = await fs.promises.readFile(pdfPath);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${pdfFilename}"`);
        res.setHeader("X-Filename", pdfFilename);
        res.send(pdfBuffer);
    } catch (err) {
        next(err);
    }
});

export default router;
