import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { tempFileManager } from "../utils/tempFileManager";

/**
 * Gera imagens de cada "página" de um PDF, usando as imagens originais
 * com a mesma escala, borda e centralização do createPdf.
 * @param inputPaths Caminhos das imagens usadas no PDF
 * @param outputDir Diretório onde salvar as imagens das páginas
 * @returns Caminhos das imagens geradas
 */
export async function pdfPageImages(inputPaths: string[], outputDir: string) {
    const A4_WIDTH = 595.28; // PDF points
    const A4_HEIGHT = 841.89;
    const innerMargin = 24;
    const borderWidth = 2;

    const pageImages: string[] = [];

    for (let index = 0; index < inputPaths.length; index++) {
        const imgPath = inputPaths[index];
        const image = sharp(imgPath);
        const metadata = await image.metadata();
        if (!metadata.width || !metadata.height) throw new Error(`Não foi possível ler imagem: ${imgPath}`);

        const imgWidth = metadata.width;
        const imgHeight = metadata.height;

        // Escala para caber na página A4 (mesmo cálculo do PDF)
        const usableWidth = A4_WIDTH - innerMargin - borderWidth * 2;
        const usableHeight = A4_HEIGHT - innerMargin - borderWidth * 2;
        const scale = Math.min(usableWidth / imgWidth, usableHeight / imgHeight, 1);

        const scaledWidth = Math.round(imgWidth * scale);
        const scaledHeight = Math.round(imgHeight * scale);

        // Criar fundo branco do tamanho da página
        const canvasWidth = Math.round(A4_WIDTH);
        const canvasHeight = Math.round(A4_HEIGHT);
        const x = Math.round((canvasWidth - scaledWidth) / 2);
        const y = Math.round((canvasHeight - scaledHeight) / 2);

        const outputFile = path.join(outputDir, `page-${index + 1}.png`);

        // Cria uma imagem com borda e centralização
        const pageBuffer = await image
            .resize(scaledWidth, scaledHeight)
            .extend({
                top: y,
                bottom: canvasHeight - scaledHeight - y,
                left: x,
                right: canvasWidth - scaledWidth - x,
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            })
            .png()
            .toBuffer();

        // Adicionar borda (retângulo preto)
        const finalImage = await sharp({
            create: {
                width: canvasWidth,
                height: canvasHeight,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            },
        })
            .composite([
                { input: pageBuffer, top: 0, left: 0 },
                {
                    input: Buffer.from(
                        `<svg width="${canvasWidth}" height="${canvasHeight}">
                            <rect x="${innerMargin / 2}" y="${innerMargin / 2}" width="${
                            canvasWidth - innerMargin
                        }" height="${canvasHeight - innerMargin}" fill="none" stroke="black" stroke-width="${borderWidth}" />
                        </svg>`
                    ),
                    top: 0,
                    left: 0,
                },
            ])
            .png()
            .toFile(outputFile);

        pageImages.push(outputFile);
        tempFileManager.add(outputFile);
    }

    return pageImages;
}
