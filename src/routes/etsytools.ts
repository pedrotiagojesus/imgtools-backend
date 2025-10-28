import express from "express";
import path from "path";
import archiver from "archiver";
import upload from "../utils/upload";
import { tempFileManager } from "../utils/tempFileManager";
import { OUTPUT_DIR } from "../utils/coreFolders";
import { slugify } from "../utils/text";

// Serviços existentes
import { convertRaster } from "../services/convertRaster";
import { dpiAjust } from "../services/dpiAjust";
import { createPdf } from "../services/createPdf";
import { pdfPageImages } from "../services/pdfPageImages";

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

    const { pdfTitle, pdfDescription } = req.body;

    try {
        const processedPaths: string[] = [];

        // 1️⃣ Converter e ajustar DPI das imagens enviadas
        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];

            console.log(`📥 Recebido: ${file.originalname}`);

            const baseName = `convert-${Date.now()}-${index + 1}.png`;
            const convertedPath = path.join(OUTPUT_DIR, baseName);
            await convertRaster(file.path, convertedPath, "png");

            const dpiName = `dpi-${Date.now()}-${index + 1}.png`;
            const dpiPath = path.join(OUTPUT_DIR, dpiName);
            await dpiAjust(convertedPath, dpiPath, { dpi: 300 });

            processedPaths.push(dpiPath);

            tempFileManager.add(file.path);
            tempFileManager.add(convertedPath);
            tempFileManager.add(dpiPath);
        }

        // 2️⃣ Gerar PDF
        const pdfFilename = `${slugify(pdfTitle)}.pdf`;
        const pdfPath = path.join(OUTPUT_DIR, pdfFilename);
        await createPdf(processedPaths, pdfPath, pdfTitle, "Pedro Jesus", pdfDescription, "ETSY Tools");
        console.log(`📄 PDF gerado: ${pdfPath}`);

        // Depois de gerar o PDF
        const pageImages = await pdfPageImages(processedPaths, OUTPUT_DIR);

        // 4️⃣ Criar ZIP (PDF + imagens + páginas)
        const zipFilename = `${slugify(pdfTitle)}.zip`;
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.pipe(res);

        archive.file(pdfPath, { name: pdfFilename });
        for (const imgPath of pageImages) {
            archive.file(imgPath, { name: path.basename(imgPath) });
        }

        await archive.finalize();
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
