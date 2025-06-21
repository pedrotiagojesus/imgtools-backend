import fs from "fs/promises";
import { PDFDocument, rgb } from "pdf-lib";

export async function createPdf(
    inputPaths: string[],
    outputPath: string,
    pdfTitle: string,
    pdfAuthor: string,
    pdfSubject: string,
    pdfCreator: string
): Promise<void> {
    const pdfDoc = await PDFDocument.create();

    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    const innerMargin = 24;
    const borderWidth = 2;

    for (const imgPath of inputPaths) {
        const imageBytes = await fs.readFile(imgPath);
        const ext = imgPath.toLowerCase().endsWith(".png") ? "png" : "jpg";

        const image = ext === "png"
            ? await pdfDoc.embedPng(imageBytes)
            : await pdfDoc.embedJpg(imageBytes);

        const imgWidth = image.width;
        const imgHeight = image.height;

        const usableWidth = A4_WIDTH - innerMargin - borderWidth * 2;
        const usableHeight = A4_HEIGHT - innerMargin - borderWidth * 2;

        const scale = Math.min(usableWidth / imgWidth, usableHeight / imgHeight, 1);

        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;

        const x = (A4_WIDTH - scaledWidth) / 2;
        const y = (A4_HEIGHT - scaledHeight) / 2;

        const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

        const borderOpt = {
            x: innerMargin / 2,
            y: innerMargin / 2,
            width: A4_WIDTH - innerMargin,
            height: A4_HEIGHT - innerMargin,
            color: undefined,
            borderColor: rgb(0, 0, 0),
            borderWidth
        };

        // ✅ Desenhar linha na borda da página (como moldura preta)
        page.drawRectangle(borderOpt);

        const imgOpt = {
            x,
            y,
            width: scaledWidth,
            height: scaledHeight,
        };

        // ✅ Desenhar imagem com margem interna
        page.drawImage(image, imgOpt);
    }

    // Metadados
    pdfDoc.setTitle(pdfTitle);
    pdfDoc.setAuthor(pdfAuthor || "IMGTOOLS");
    pdfDoc.setSubject(pdfSubject);
    pdfDoc.setCreator(pdfCreator || "IMGTOOLS");
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
}
