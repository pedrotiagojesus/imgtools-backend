import fs from "fs/promises";
import { PDFDocument, rgb } from "pdf-lib";
import { getImageExtension, validatePdfOutput } from "../utils/pdfUtils";
import { pdf } from "../config/pdf";
import { withTimeout } from "../utils/withTimeout";
import { env } from "../config/env";
import { logger } from "../config/logger";

export async function createPdf(
    inputPaths: string[],
    pdfPath: string,
    pdfTitle: string,
    pdfAuthor: string,
    pdfSubject: string,
    pdfCreator: string,
    requestId?: string
): Promise<void> {
    const startTime = Date.now();

    logger.debug("Iniciando criação de PDF", {
        requestId,
        imageCount: inputPaths.length,
        pdfTitle,
        pdfPath
    });

    try {
        const pdfDoc = await withTimeout(
            PDFDocument.create(),
            env.IMAGE_PROCESSING_TIMEOUT_MS,
            'PDF document creation'
        );

        const A4_WIDTH = pdf.width;
        const A4_HEIGHT = pdf.height;
        const innerVerticalMargin = pdf.margin.top + pdf.margin.bottom;
        const innerHorizontalMargin = pdf.margin.left + pdf.margin.right;
        const borderWidth = pdf.border_width;

        for (const imgPath of inputPaths) {
            const ext = getImageExtension(imgPath);
            if (!ext) {
                throw new Error(`Formato não suportado: ${imgPath}`);
            }

            try {
                await fs.access(imgPath);
            } catch {
                throw new Error(`Imagem não encontrada: ${imgPath}`);
            }

            const imageBytes = await fs.readFile(imgPath);
            const image = ext === "png"
                ? await withTimeout(pdfDoc.embedPng(imageBytes), env.IMAGE_PROCESSING_TIMEOUT_MS, 'PNG embedding')
                : await withTimeout(pdfDoc.embedJpg(imageBytes), env.IMAGE_PROCESSING_TIMEOUT_MS, 'JPG embedding');

            const imgWidth = image.width;
            const imgHeight = image.height;

            // Calcular posição e tamanho da borda
            const borderX = pdf.margin.left;
            const borderY = pdf.margin.bottom;
            const borderInnerWidth = A4_WIDTH - pdf.margin.left - pdf.margin.right;
            const borderInnerHeight = A4_HEIGHT - pdf.margin.top - pdf.margin.bottom;

            // Área disponível para a imagem (dentro da borda)
            const usableWidth = borderInnerWidth - borderWidth * 2;
            const usableHeight = borderInnerHeight - borderWidth * 2;
            const scale = Math.min(usableWidth / imgWidth, usableHeight / imgHeight, 1);

            const scaledWidth = imgWidth * scale;
            const scaledHeight = imgHeight * scale;

            // Centralizar imagem dentro da área da borda
            const imageX = borderX + borderWidth + (usableWidth - scaledWidth) / 2;
            const imageY = borderY + borderWidth + (usableHeight - scaledHeight) / 2;

            const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

            // Desenhar borda
            page.drawRectangle({
                x: borderX,
                y: borderY,
                width: borderInnerWidth,
                height: borderInnerHeight,
                borderColor: rgb(0, 0, 0),
                borderWidth,
            });

            // Desenhar imagem centralizada dentro da borda
            page.drawImage(image, { x: imageX, y: imageY, width: scaledWidth, height: scaledHeight });

            logger.debug("Imagem adicionada ao PDF", {
                requestId,
                imagePath: imgPath,
                pageNumber: pdfDoc.getPageCount()
            });
        }

        if (pdfDoc.getPageCount() === 0) {
            throw new Error("PDF não contém páginas válidas.");
        }

        pdfDoc.setTitle(pdfTitle?.slice(0, 100) || "IMGTOOLS");
        pdfDoc.setAuthor(pdfAuthor || "IMGTOOLS");
        pdfDoc.setSubject(pdfSubject || "");
        pdfDoc.setCreator(pdfCreator || "IMGTOOLS");
        pdfDoc.setCreationDate(new Date());
        pdfDoc.setModificationDate(new Date());

        const pdfBytes = await withTimeout(
            pdfDoc.save(),
            env.IMAGE_PROCESSING_TIMEOUT_MS,
            'PDF save'
        );
        await fs.writeFile(pdfPath, pdfBytes);

        await validatePdfOutput(pdfPath, requestId);

        const duration = Date.now() - startTime;
        const fileSize = pdfBytes.length;

        logger.info("PDF criado com sucesso", {
            requestId,
            pdfPath,
            pageCount: pdfDoc.getPageCount(),
            fileSize,
            duration
        });
    } catch (err) {
        const duration = Date.now() - startTime;
        logger.error("Erro ao criar PDF", {
            requestId,
            pdfPath,
            imageCount: inputPaths.length,
            duration,
            error: err instanceof Error ? err.message : String(err)
        });
        throw err;
    }
}
