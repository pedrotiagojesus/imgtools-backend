import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { tempFileManager } from "../utils/tempFileManager";

/**
 * Converte cada página de um PDF em PNG
 * @param pdfPath Caminho do PDF
 * @param outputDir Diretório onde as imagens serão salvas
 * @param prefix Prefixo opcional para nomear as imagens
 * @returns Array de caminhos das imagens geradas
 */
export async function pdfToPng(pdfPath: string, outputDir: string, prefix?: string): Promise<string[]> {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    const baseName = prefix ?? path.basename(pdfPath, path.extname(pdfPath));
    const pageImages: string[] = [];

    for (let i = 0; i < pageCount; i++) {
        // Criar um novo PDF apenas com a página atual
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(copiedPage);

        const pagePdfBytes = await newPdf.save();
        const pagePdfPath = path.join(outputDir, `${baseName}-page-${i + 1}.pdf`);
        fs.writeFileSync(pagePdfPath, pagePdfBytes);
        tempFileManager.add(pagePdfPath);

        // Converter PDF da página em PNG usando Sharp
        const pngPath = path.join(outputDir, `${baseName}-page-${i + 1}.png`);
        await sharp(pagePdfPath, { density: 300 }).png().toFile(pngPath);
        tempFileManager.add(pngPath);

        pageImages.push(pngPath);
    }

    return pageImages;
}
