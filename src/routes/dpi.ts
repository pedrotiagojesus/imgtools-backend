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
import { isValidDPI } from "../utils/validators";

const router = express.Router();

router.post("/", upload.array("images"), async (req, res) => {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }

    const { dpi, zip } = req.body;

    if (!isValidDPI(dpi)) {
        return res.status(400).json({ error: "Invalid DPI value" });
    }

    const dpiValue = parseInt(dpi);
    const outputFiles: string[] = [];

    try {
        for (const [index, file] of req.files.entries()) {
            try {
                const ext = path.extname(file.originalname) || ".jpg";
                const outputImagePath = path.join(OUTPUT_DIR, `image-${index + 1}${ext}`);

                await dpiAjust(file.path, outputImagePath, { dpi: dpiValue });

                outputFiles.push(outputImagePath);
                tempFileManager.add(file.path);
                console.log(`✅ DPI ajustado: ${file.originalname} → ${outputImagePath}`);
            } catch (err) {
                console.error(`Erro ao processar ${file.originalname}:`, err);
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
        tempFileManager.cleanup().catch(err =>
            console.error("Erro ao limpar ficheiros temporários:", err)
        );
    }
});

export default router;
