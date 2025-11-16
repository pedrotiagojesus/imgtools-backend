import sharp from "sharp";
import { withTimeout } from "../utils/withTimeout";
import { env } from "../config/env";
import { logger } from "../config/logger";

interface ResizeOptions {
    width?: number;
    height?: number;
}

export async function resizeImage(
    inputPath: string,
    outputPath: string,
    options: ResizeOptions,
    requestId?: string
): Promise<void> {
    const { width, height } = options;
    const startTime = Date.now();

    logger.debug("Iniciando redimensionamento de imagem", {
        requestId,
        inputPath,
        outputPath,
        width,
        height
    });

    try {
        // ⚡ Optimize Sharp for better performance
        sharp.cache(false);
        sharp.concurrency(1); // Limit concurrency per process
        sharp.simd(true);     // Use SIMD instructions (faster)

        await withTimeout(
            sharp(inputPath)
                .resize({
                    width,
                    height,
                    fit: "inside",
                    withoutEnlargement: true,
                    fastShrinkOnLoad: true // ⚡ Faster for shrinking
                })
                .toFile(outputPath),
            env.IMAGE_PROCESSING_TIMEOUT_MS,
            'Image resize'
        );

        const duration = Date.now() - startTime;
        logger.info("Imagem redimensionada com sucesso", {
            requestId,
            inputPath,
            outputPath,
            width,
            height,
            duration
        });
    } catch (err) {
        const duration = Date.now() - startTime;
        logger.error("Erro ao redimensionar imagem", {
            requestId,
            inputPath,
            width,
            height,
            duration,
            error: err instanceof Error ? err.message : String(err)
        });
        throw err;
    }
}
