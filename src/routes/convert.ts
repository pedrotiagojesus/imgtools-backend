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

const router = express.Router();

router.post("/", upload.array("images"), async (req, res) => {
    const { format, zip } = req.body;

    if (!format) {
        return res.status(400).json({ error: "Formato de saída não especificado." });
    }

    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
        return res.status(400).json({ error: "Nenhuma imagem enviada." });
    }

    if (!isValidFormat(format)) {
        return res.status(400).json({ error: "Formato inválido." });
    }

    const outputFiles: string[] = [];

    try {
        for (const [index, file] of req.files.entries()) {
            try {
                const baseName = `image-${index + 1}.${format}`;
                const outputPath = path.join(OUTPUT_DIR, baseName);

                if (format === "svg") {
                    if (!isVectorizable(file.mimetype)) {
                        console.warn(`Imagem ignorada: ${file.originalname} não é vetorizável.`);
                        tempFileManager.add(file.path);
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
                tempFileManager.add(file.path);
                console.log(`✅ Imagem convertida: ${file.path}`);
            } catch (err) {
                console.error(`Erro ao processar ${file.originalname}:`, err);
                tempFileManager.add(file.path);
            }
        }

        await sendImageResponse(res, outputFiles, zip === "true");
    } catch (err) {
        console.error("Erro ao converter imagens:", err);
        res.status(500).json({ error: "Erro ao converter imagens." });
    } finally {
        tempFileManager.cleanup().catch(err =>
            console.error("Erro ao limpar ficheiros temporários:", err)
        );
    }
});

export default router;
