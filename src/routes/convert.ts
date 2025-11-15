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
