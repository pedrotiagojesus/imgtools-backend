import express from "express";
import path from "path";

// Services
import { resizeImage } from "../services/resizeImage";

// Utils
import { tempFileManager } from "../utils/tempFileManager";
import upload from "../utils/upload";
import { OUTPUT_DIR } from "../utils/coreFolders";
import { sendImageResponse } from "../utils/imageResponse";

const router = express.Router();

router.post("/", upload.array("images"), async (req, res) => {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }

    const { width, height, zip } = req.body;

    if (!width && !height) {
        // remover todos os arquivos enviados (req.files)
        return res.status(400).json({ error: "Width or height required" });
    }

    const parsedWidth = width ? parseInt(width) : undefined;
    const parsedHeight = height ? parseInt(height) : undefined;

    try {
        const outputFiles: string[] = [];

        // Redimensionar imagens
        await Promise.all(
            req.files.map(async (file, index) => {
                const ext = path.extname(file.originalname) || ".jpg";
                const outputImagePath = path.join(OUTPUT_DIR, `image-${index + 1}${ext}`);

                await resizeImage(file.path, outputImagePath, {
                    width: parsedWidth,
                    height: parsedHeight,
                });

                outputFiles.push(outputImagePath);
                tempFileManager.add(file.path);
            })
        );

        // Download
        await sendImageResponse(res, outputFiles, zip === "true");
    } catch (err) {
        console.error("Erro ao redimensionar imagens:", err);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Erro ao redimensionar imagens." });
        }
    } finally {
        setImmediate(async () => {
            try {
                await tempFileManager.cleanup();
            } catch (err) {
                console.error("Erro ao limpar ficheiros temporários:", err);
            }
        });
    }
});

export default router;
