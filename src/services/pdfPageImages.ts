import sharp from "sharp";
import path from "path";
import { tempFileManager } from "../utils/tempFileManager";
import { pdf } from "../config/pdf";
import { logger } from "../config/logger";

export async function pdfPageImages(inputPaths: string[], outputDir: string, requestId?: string) {
    const startTime = Date.now();

    logger.debug("Iniciando geração de imagens de páginas", {
        requestId,
        imageCount: inputPaths.length,
        outputDir
    });

    const A4_WIDTH = pdf.width;
    const A4_HEIGHT = pdf.height;
    const innerVerticalMargin = pdf.margin.top + pdf.margin.bottom;
    const innerHorizontalMargin = pdf.margin.left + pdf.margin.right;
    const borderWidth = pdf.border_width;

    const pageImages: string[] = [];

    for (let index = 0; index < inputPaths.length; index++) {
        const imgPath = inputPaths[index];
        const image = sharp(imgPath);
        const metadata = await image.metadata();
        if (!metadata.width || !metadata.height) throw new Error(`Não foi possível ler imagem: ${imgPath}`);

        const imgWidth = metadata.width;
        const imgHeight = metadata.height;

        // Escala para caber na página A4 (mesmo cálculo do PDF)
        const usableWidth = A4_WIDTH - innerHorizontalMargin - borderWidth * 2;
        const usableHeight = A4_HEIGHT - innerVerticalMargin - borderWidth * 2;
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
                            <rect x="${innerHorizontalMargin / 2}" y="${innerVerticalMargin / 2}" width="${
                            canvasWidth - innerHorizontalMargin
                        }" height="${
                            canvasHeight - innerVerticalMargin
                        }" fill="none" stroke="black" stroke-width="${borderWidth}" />
                        </svg>`
                    ),
                    top: 0,
                    left: 0,
                },
            ])
            .png()
            .toFile(outputFile);

        pageImages.push(outputFile);

        logger.debug("Imagem de página gerada", {
            requestId,
            pageNumber: index + 1,
            outputFile
        });
    }

    const duration = Date.now() - startTime;

    logger.info("Imagens de páginas geradas com sucesso", {
        requestId,
        pageCount: pageImages.length,
        duration
    });

    return pageImages;
}
