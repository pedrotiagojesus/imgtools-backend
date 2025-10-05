import express from "express";
import path from "path";
import fs from "fs";

// Utils
import upload from "../utils/upload";
import { tempFileManager } from "../utils/tempFileManager";
import { OUTPUT_DIR } from "../utils/coreFolders";

// Services
import { convertRaster } from "../services/convertRaster";
import { dpiAjust } from "../services/dpiAjust";
import { createPdf } from "../services/createPdf";

const router = express.Router();

router.post("/generate-product", upload.array("images"), async (req, res) => {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
        return res.status(400).json({ error: "Nenhum ficheiro foi enviado." });
    }

    const rasterExtensions = [".png", ".jpg", ".jpeg", ".tiff", ".webp", ".bmp"];
    for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!rasterExtensions.includes(ext)) {
            await tempFileManager.cleanup();
            return res.status(400).json({
                error: `Formato não suportado: ${file.originalname}. Apenas imagens raster são permitidas.`,
            });
        }
    }

    try {
        const processedPaths: string[] = [];

        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];
            const ext = path.extname(file.originalname).toLowerCase();

            console.log(`📥 Recebido: ${file.originalname}`);

            // 1. Converter para PNG
            const baseName = `convert-${Date.now()}-${index + 1}.png`;
            const convertedPath = path.join(OUTPUT_DIR, baseName);
            await convertRaster(file.path, convertedPath, "png");
            console.log(`🔄 Convertido para PNG: ${convertedPath}`);

            // 2. Ajustar DPI sobre imagem convertida
            const dpiName = `dpi-${Date.now()}-${index + 1}.png`;
            const dpiPath = path.join(OUTPUT_DIR, dpiName);
            await dpiAjust(convertedPath, dpiPath, { dpi: 300 });
            console.log(`🖨️ DPI ajustado: ${dpiPath}`);

            processedPaths.push(dpiPath);

            // 3. Gerir ficheiros temporários
            tempFileManager.add(file.path);
            tempFileManager.add(convertedPath);
            tempFileManager.add(dpiPath);
        }

        // 4. Gerar PDF
        const pdfFilename = "images.pdf";
        const pdfPath = path.join(OUTPUT_DIR, pdfFilename);
        await createPdf(processedPaths, pdfPath, "TESTE", "PEDRO", "TESTER", "PEDRO");
        console.log(`📄 PDF gerado: ${pdfPath}`);

        const pdfBuffer = fs.readFileSync(pdfPath);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${pdfFilename}"`);
        res.setHeader("X-Filename", pdfFilename);
        res.send(pdfBuffer);
    } catch (err) {
        console.error("❌ Erro ao processar imagens:", err);
        res.status(500).json({ error: "Erro ao processar imagens", details: err });
    } finally {
        setImmediate(async () => {
            try {
                await tempFileManager.cleanup();
            } catch (err) {
                console.error("⚠️ Erro ao limpar ficheiros temporários:", err);
            }
        });
    }
});

export default router;
