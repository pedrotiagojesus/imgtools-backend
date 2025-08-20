import express from "express";
import path from "path";
import fs from "fs";

// Services
import { convertRaster } from "../services/convertRaster";
import { convertVectorize } from "../services/convertVectorize";

// Utils
import { tempFileManager } from "../utils/tempFileManager";
import { createOutputPaths, createZip, getBase64FileBuffers } from "../utils/imageProcessingHelpers";
import upload from "../utils/upload";

const router = express.Router();

router.post("/", upload.array("images"), async (req, res) => {
    const { format, zip } = req.body;
    const asZip = zip === "true";

    if (!format) return res.status(400).json({ error: "Formato de saída não especificado." });

    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
        return res.status(400).json({ error: "Nenhuma imagem enviada." });
    }

    const allowedFormats = ["jpeg", "png", "webp", "tiff", "avif", "svg"];
    if (!allowedFormats.includes(format)) {
        return res.status(400).json({ error: "Formato inválido." });
    }

    const { outputDir, zipPath } = createOutputPaths(__dirname);

    try {
        const outputFiles: string[] = [];

        await Promise.all(
            req.files.map(async (file, index) => {
                const baseName = `image-${index + 1}.${format}`;
                const outputPath = path.join(outputDir, baseName);

                if (format === "svg") {
                    if (!["image/png", "image/jpeg"].includes(file.mimetype)) {
                        throw new Error("Só PNG ou JPEG podem ser vetorizados em SVG.");
                    }

                    const svg = await convertVectorize(file.path, {
                        resize: { width: 800, height: 600 },
                        backgroundColor: "#ffffff",
                        threshold: 180,
                    });

                    fs.writeFileSync(outputPath, svg, "utf-8");
                } else {
                    await convertRaster(file.path, outputPath, format as any);
                }

                outputFiles.push(outputPath);
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
        console.error("Erro ao converter imagens:", err);
        res.status(500).json({ error: "Erro ao converter imagens." });
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
