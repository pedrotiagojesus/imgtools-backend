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

const router = express.Router();

router.post("/", upload.array("images"), async (req, res) => {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }

    const { width, height, zip } = req.body;

    if (!width && !height) {
        return res.status(400).json({ error: "Width or height required" });
    }

    if (!isValidDimension(width) || !isValidDimension(height)) {
        return res.status(400).json({ error: "Width and height must be valid positive numbers" });
    }

    const parsedWidth = width ? parseInt(width) : undefined;
    const parsedHeight = height ? parseInt(height) : undefined;

    const outputFiles: string[] = [];

    try {
        for (const [index, file] of req.files.entries()) {
            try {
                const ext = path.extname(file.originalname) || ".jpg";
                const outputImagePath = path.join(OUTPUT_DIR, `image-${index + 1}${ext}`);

                await resizeImage(file.path, outputImagePath, {
                    width: parsedWidth,
                    height: parsedHeight,
                });

                outputFiles.push(outputImagePath);
                tempFileManager.add(file.path);
                console.log(`✅ Imagem redimensionada: ${file.originalname} → ${outputImagePath}`);
            } catch (err) {
                console.error(`Erro ao redimensionar ${file.originalname}:`, err);
                tempFileManager.add(file.path);
            }
        }

        await sendImageResponse(res, outputFiles, zip === "true");
    } catch (err) {
        console.error("Erro ao redimensionar imagens:", err);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Erro ao redimensionar imagens." });
        }
    } finally {
        tempFileManager.cleanup().catch((err) => console.error("Erro ao limpar ficheiros temporários:", err));
    }
});

export default router;
