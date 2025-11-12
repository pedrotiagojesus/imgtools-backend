import fs from "fs/promises";
import { PDFDocument, rgb } from "pdf-lib";
import { tempFileManager } from "../utils/tempFileManager";
import { getImageExtension, validatePdfOutput } from "../utils/pdfUtils";
import { pdf } from "../config/pdf";
import { withTimeout } from "../utils/withTimeout";
import { env } from "../config/env";

export async function createPdf(
    inputPaths: string[],
    pdfPath: string,
    pdfTitle: string,
    pdfAuthor: string,
    pdfSubject: string,
    pdfCreator: string
): Promise<void> {
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
        if (!ext) throw new Error(`Formato não suportado: ${imgPath}`);

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

        const usableWidth = A4_WIDTH - innerHorizontalMargin - borderWidth * 2;
        const usableHeight = A4_HEIGHT - innerVerticalMargin - borderWidth * 2;
        const scale = Math.min(usableWidth / imgWidth, usableHeight / imgHeight, 1);

        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        const x = (A4_WIDTH - scaledWidth) / 2;
        const y = (A4_HEIGHT - scaledHeight) / 2;

        const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

        page.drawRectangle({
            x: innerHorizontalMargin / 2,
            y: innerVerticalMargin / 2,
            width: A4_WIDTH - innerHorizontalMargin,
            height: A4_HEIGHT - innerVerticalMargin,
            borderColor: rgb(0, 0, 0),
            borderWidth,
        });

        page.drawImage(image, { x, y, width: scaledWidth, height: scaledHeight });
        console.log(`📷 Adicionada ao PDF: ${imgPath}`);
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

    await validatePdfOutput(pdfPath);
    tempFileManager.add(pdfPath);
    console.log(`✅ PDF criado: ${pdfPath}`);
}
