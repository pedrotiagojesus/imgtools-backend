import express from "express";
import path from "path";

// Services
import { adjustDpi } from "../services/adjustDpi";

// Utils
import { tempFileManager } from "../utils/tempFileManager";
import upload from "../utils/upload";
import { OUTPUT_DIR } from "../utils/directories";
import { sendImageResponse } from "../utils/imageResponse";
import { isValidDPI, VALIDATION_LIMITS } from "../utils/validators";

// Errors
import { ValidationError } from "../errors";

const router = express.Router();

router.post("/", upload.array("images"), async (req, res, next) => {
    try {
        if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
            throw new ValidationError("Nenhuma imagem enviada.");
        }

        const { dpi, zip } = req.body;

        if (!isValidDPI(dpi)) {
            throw new ValidationError(
                `Valor de DPI inválido. Deve estar entre ${VALIDATION_LIMITS.DPI.MIN} e ${VALIDATION_LIMITS.DPI.MAX}.`
            );
        }

        const dpiValue = parseInt(dpi);

        // Register all uploaded files for cleanup immediately
        const requestId = (req as any).requestId;
        req.files.forEach(file => tempFileManager.add(file.path, requestId));

        const outputFiles: string[] = [];

        for (const [index, file] of req.files.entries()) {
            const ext = path.extname(file.originalname) || ".jpg";
            const outputImagePath = path.join(OUTPUT_DIR, `image-${index + 1}${ext}`);

            await adjustDpi(file.path, outputImagePath, { dpi: dpiValue }, requestId);

            outputFiles.push(outputImagePath);
            tempFileManager.add(outputImagePath, requestId);
        }

        await sendImageResponse(res, outputFiles, zip === "true");
    } catch (err) {
        next(err);
    }
});

export default router;
