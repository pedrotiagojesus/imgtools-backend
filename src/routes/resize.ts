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

router.post("/", upload.array("images"), async (req, res, next) => {
    try {
        if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
            throw new ValidationError("Nenhuma imagem enviada.");
        }

        const { width, height, zip } = req.body;

        if (!width && !height) {
            throw new ValidationError("Largura ou altura são obrigatórias.");
        }

        if (!isValidDimension(width) || !isValidDimension(height)) {
            throw new ValidationError("Largura e altura devem ser números positivos válidos.");
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
            }, requestId);

            outputFiles.push(outputImagePath);
            tempFileManager.add(outputImagePath, requestId);
        }

        await sendImageResponse(res, outputFiles, zip === "true");
    } catch (err) {
        next(err);
    }
});

export default router;
