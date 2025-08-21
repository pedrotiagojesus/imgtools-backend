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

const router = express.Router();

router.post("/", upload.array("images"), async (req, res) => {
    const { format, zip } = req.body;

    if (!format) return res.status(400).json({ error: "Formato de saída não especificado." });

    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
        return res.status(400).json({ error: "Nenhuma imagem enviada." });
    }

    const allowedFormats = ["jpeg", "png", "webp", "tiff", "avif", "svg"];
    if (!allowedFormats.includes(format)) {
        return res.status(400).json({ error: "Formato inválido." });
    }

    try {
        const outputFiles: string[] = [];

        await Promise.all(
            req.files.map(async (file, index) => {
                const baseName = `image-${index + 1}.${format}`;
                const outputPath = path.join(OUTPUT_DIR, baseName);

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
        await sendImageResponse(res, outputFiles, zip === "true");
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
