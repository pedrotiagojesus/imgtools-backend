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
    const startTime = Date.now();
    const timings: Record<string, number> = {};

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

        // ⚡ Convert and adjust DPI of uploaded images (with timing)
        const conversionStart = Date.now();
        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];
            const imageStart = Date.now();

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

            try {
                await adjustDpi(convertedPath, dpiPath, { dpi: 300 }, requestId);
                tempFileManager.add(dpiPath, requestId);
                processedPaths.push(dpiPath);

                logger.debug("Arquivo DPI criado", {
                    requestId,
                    dpiPath,
                    index: index + 1
                });
            } catch (dpiError) {
                logger.error("Erro ao ajustar DPI", {
                    requestId,
                    convertedPath,
                    dpiPath,
                    index: index + 1,
                    error: dpiError instanceof Error ? dpiError.message : String(dpiError)
                });
                throw dpiError;
            }

            const imageDuration = Date.now() - imageStart;
            logger.debug(`Imagem ${index + 1} processada`, {
                requestId,
                duration: imageDuration
            });
        }
        timings.imageProcessing = Date.now() - conversionStart;

        // ⚡ Verify all processed files exist before continuing
        const fs = await import("fs/promises");
        for (const filePath of processedPaths) {
            try {
                await fs.access(filePath);
                logger.debug("Arquivo verificado", { requestId, filePath });
            } catch (err) {
                logger.error("Arquivo processado não encontrado", {
                    requestId,
                    filePath,
                    error: err instanceof Error ? err.message : String(err)
                });
                throw new Error(`Arquivo processado não encontrado: ${filePath}`);
            }
        }

        // ⚡ Generate PDF (with timing)
        const pdfStart = Date.now();
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
        timings.pdfGeneration = Date.now() - pdfStart;

        // ⚡ Generate page images (with timing)
        const pageImagesStart = Date.now();
        const pageImages = await pdfPageImages(processedPaths, OUTPUT_DIR, requestId);
        pageImages.forEach(imgPath => tempFileManager.add(imgPath, requestId));
        timings.pageImagesGeneration = Date.now() - pageImagesStart;

        // ⚡ Create ZIP with organized structure (PDF + Images folder)
        const zipStart = Date.now();
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

        // Add PDF to root of ZIP
        archive.file(pdfPath, { name: pdfFilename });

        // Add page images to "Images" folder inside ZIP
        for (const imgPath of pageImages) {
            archive.file(imgPath, { name: `Images/${path.basename(imgPath)}` });
        }

        await archive.finalize();
        timings.zipCreation = Date.now() - zipStart;
        timings.total = Date.now() - startTime;

        logger.info("Produto Etsy gerado com sucesso", {
            requestId,
            zipFilename,
            timings: {
                imageProcessing: `${timings.imageProcessing}ms`,
                pdfGeneration: `${timings.pdfGeneration}ms`,
                pageImagesGeneration: `${timings.pageImagesGeneration}ms`,
                zipCreation: `${timings.zipCreation}ms`,
                total: `${timings.total}ms`
            }
        });
    } catch (err) {
        next(err);
    }
});

export default router;
