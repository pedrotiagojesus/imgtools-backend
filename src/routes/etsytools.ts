import express from "express";

// Utils
import { tempFileManager } from "../utils/tempFileManager";
import upload from "../utils/upload";
import { OUTPUT_DIR } from "../utils/coreFolders";
import { convertRaster } from "../services/convertRaster";
import path from "path";
import { createPdf } from "../services/createPdf";
import fs from "fs";
import { dpiAjust } from "../services/dpiAjust";

const router = express.Router();

router.post("/generate-product", upload.array("images"), async (req, res) => {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }

    const rasterExtensions = [".png", ".jpg", ".jpeg", ".tiff", ".webp", ".bmp"];
    for (const file of req.files) {
        const ext = file.originalname ? file.originalname.toLowerCase().split(".").pop() : "";
        if (!rasterExtensions.includes(`.${ext}`)) {
            await tempFileManager.cleanup();
            return res
                .status(400)
                .json({ error: `Formato não suportado: ${file.originalname}. Apenas imagens raster são permitidas.` });
        }
    }

    try {
        let processedPaths: string[] = [];

        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];

            // 1. Converter imagem
            const baseName = `convert-${index + 1}.png`;
            const convertedPath = path.join(OUTPUT_DIR, baseName);
            await convertRaster(file.path, convertedPath, "png");

            // 2. Resize
            // const resizedPath = await resizeImage(convertedPath);

            // 3. Ajustar DPI
            const dpiPath = path.join(OUTPUT_DIR, `dpi-${index + 1}.png`);
            await dpiAjust(file.path, dpiPath, { dpi: 300 });
            processedPaths.push(dpiPath);

            tempFileManager.add(file.path);
            tempFileManager.add(convertedPath);
            tempFileManager.add(dpiPath);
        }

        // 4. Gerar PDF
        const pdfFilename = "images.pdf";
        const pdfPath = path.join(OUTPUT_DIR, pdfFilename);
        await createPdf(processedPaths, pdfPath, "TESTE", "PEDRO", "TESTER", "PEDRO");

        const pdfBuffer = fs.readFileSync(pdfPath);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${pdfFilename}"`);
        res.setHeader("X-Filename", pdfFilename);
        res.send(pdfBuffer);
        return;
    } catch (err) {
        res.status(500).json({ error: "Erro ao processar imagens", details: err });
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
