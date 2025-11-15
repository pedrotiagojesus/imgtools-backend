import sharp from "sharp";
import { isValidFormat } from "../utils/validators";
import { withTimeout } from "../utils/withTimeout";
import { env } from "../config/env";
import { logger } from "../config/logger";

export async function convertRaster(
    inputPath: string,
    outputPath: string,
    format: "jpeg" | "png" | "webp" | "avif" | "tiff",
    requestId?: string
): Promise<void> {
    if (!isValidFormat(format)) {
        throw new Error(`Formato inválido: ${format}`);
    }

    const startTime = Date.now();

    try {
        sharp.cache(false);
        await withTimeout(
            sharp(inputPath).toFormat(format).toFile(outputPath),
            env.IMAGE_PROCESSING_TIMEOUT_MS,
            'Image conversion'
        );

        const duration = Date.now() - startTime;
        logger.info("Imagem convertida com sucesso", {
            requestId,
            inputPath,
            outputPath,
            format,
            duration
        });
    } catch (err) {
        const duration = Date.now() - startTime;
        logger.error("Erro ao converter imagem", {
            requestId,
            inputPath,
            format,
            duration,
            error: err instanceof Error ? err.message : String(err)
        });
        throw new Error(`Erro ao converter imagem: ${inputPath} → ${format}`);
    }
}
