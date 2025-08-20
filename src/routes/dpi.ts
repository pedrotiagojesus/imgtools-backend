import express from "express";
import path from "path";
import fs from "fs";

// Services
import { dpiAjust } from "../services/dpiAjust";

// Utils
import { tempFileManager } from "../utils/tempFileManager";
import { createOutputPaths, createZip, getBase64FileBuffers } from "../utils/imageProcessingHelpers";
import upload from "../utils/upload";

const router = express.Router();

router.post("/", upload.array("images"), async (req, res) => {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }

    const { dpi, zip } = req.body;
    const asZip = zip === "true";

    const dpiValue = parseInt(dpi);
    if (isNaN(dpiValue) || dpiValue <= 0) {
        // remover todos os arquivos enviados (req.files)
        return res.status(400).json({ error: "Invalid DPI value" });
    }

    const { outputDir, zipPath } = createOutputPaths(__dirname);

    try {

        const outputFiles: string[] = [];

        // Redimensionar imagens
        await Promise.all(
            req.files.map(async (file, index) => {
                const ext = path.extname(file.originalname) || ".jpg";
                const outputImagePath = path.join(outputDir, `image-${index + 1}${ext}`);

                await dpiAjust(file.path, outputImagePath, { dpi: dpiValue });

                outputFiles.push(outputImagePath);
                tempFileManager.add(file.path);
            })
        );

        // Download
        if (asZip) {
            await createZip(zipPath, outputDir);
            return res.download(zipPath, () => {
                fs.rmSync(outputDir, { recursive: true, force: true });
                fs.unlink(zipPath, () => {});
            });
        } else {
            const buffers = getBase64FileBuffers(outputFiles);
            fs.rmSync(outputDir, { recursive: true, force: true });
            return res.json({ files: buffers });
        }
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
