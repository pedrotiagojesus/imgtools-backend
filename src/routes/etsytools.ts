import express from "express";
import path from "path";
import archiver from "archiver";

// Utils
import upload from "../utils/upload";
import { tempFileManager } from "../utils/tempFileManager";
import { OUTPUT_DIR } from "../utils/directories";
import { slugify } from "../utils/text";
import { logger } from "../config/logger";

// Services
import { convertRaster } from "../services/convertRaster";
import { adjustDpi } from "../services/adjustDpi";
import { createPdf } from "../services/createPdf";
import { pdfPageImages } from "../services/pdfPageImages";

// Errors
import { ValidationError } from "../errors";

const router = express.Router();

router.post("/generate-product", upload.array("images"), async (req, res, next) => {
    try {
        if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
            throw new ValidationError("Nenhuma imagem enviada.");
        }

        const { pdfTitle, pdfDescription } = req.body;

        if (!pdfTitle) {
            throw new ValidationError("Título do PDF é obrigatório.");
        }

        // Validate file types
        const rasterExtensions = [".png", ".jpg", ".jpeg", ".tiff", ".webp", ".bmp"];
        const invalidFiles = req.files.filter((file) => {
            const ext = path.extname(file.originalname).toLowerCase();
            return !rasterExtensions.includes(ext);
        });

        if (invalidFiles.length > 0) {
            const names = invalidFiles.map((f) => f.originalname).join(", ");
            throw new ValidationError(
                `Formatos não suportados: ${names}. Apenas imagens raster são permitidas.`
            );
        }

        // Register all uploaded files for cleanup immediately
        const requestId = (req as any).requestId;
        req.files.forEach(file => tempFileManager.add(file.path, requestId));

        logger.info("Iniciando geração de produto Etsy", {
            requestId,
            fileCount: req.files.length,
            pdfTitle
        });

        const processedPaths: string[] = [];

        // Convert and adjust DPI of uploaded images
        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];

            logger.debug("Processando imagem", {
                requestId,
                filename: file.originalname,
                index: index + 1,
                total: req.files.length
            });

            const baseName = `convert-${requestId}-${index + 1}.png`;
            const convertedPath = path.join(OUTPUT_DIR, baseName);
            await convertRaster(file.path, convertedPath, "png", requestId);
            tempFileManager.add(convertedPath, requestId);

            const dpiName = `dpi-${requestId}-${index + 1}.png`;
            const dpiPath = path.join(OUTPUT_DIR, dpiName);
            await adjustDpi(convertedPath, dpiPath, { dpi: 300 }, requestId);
            tempFileManager.add(dpiPath, requestId);

            processedPaths.push(dpiPath);
        }

        // Generate PDF
        const pdfFilename = `${slugify(pdfTitle)}.pdf`;
        const pdfPath = path.join(OUTPUT_DIR, pdfFilename);
        await createPdf(
            processedPaths,
            pdfPath,
            pdfTitle,
            "Pedro Jesus",
            pdfDescription || "",
            "ETSY Tools",
            requestId
        );
        tempFileManager.add(pdfPath, requestId);

        // Generate page images
        const pageImages = await pdfPageImages(processedPaths, OUTPUT_DIR, requestId);
        pageImages.forEach(imgPath => tempFileManager.add(imgPath, requestId));



        // Create ZIP (PDF + page images)
        const zipFilename = `${slugify(pdfTitle)}.zip`;
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);
        res.setHeader("X-Filename", zipFilename);

        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.on("error", (err) => {
            logger.error("Erro ao criar arquivo ZIP", {
                requestId,
                error: err.message
            });
            throw err;
        });

        archive.pipe(res);

        archive.file(pdfPath, { name: pdfFilename });
        for (const imgPath of pageImages) {
            archive.file(imgPath, { name: path.basename(imgPath) });
        }

        await archive.finalize();

        logger.info("Produto Etsy gerado com sucesso", {
            requestId,
            zipFilename
        });
    } catch (err) {
        next(err);
    }
});

export default router;
