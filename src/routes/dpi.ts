import express from "express";
import path from "path";
import fs from "fs";

// Services
import { dpiAjust } from "../services/dpiAjust";

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

    const { dpi, zip } = req.body;

    const dpiValue = parseInt(dpi);
    if (isNaN(dpiValue) || dpiValue <= 0) {
        // remover todos os arquivos enviados (req.files)
        return res.status(400).json({ error: "Invalid DPI value" });
    }

    try {
        const outputFiles: string[] = [];

        // Redimensionar imagens
        await Promise.all(
            req.files.map(async (file, index) => {
                const ext = path.extname(file.originalname) || ".jpg";
                const outputImagePath = path.join(OUTPUT_DIR, `image-${index + 1}${ext}`);

                await dpiAjust(file.path, outputImagePath, { dpi: dpiValue });

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
