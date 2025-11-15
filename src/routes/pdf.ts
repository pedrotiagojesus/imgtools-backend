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
