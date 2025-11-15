import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import potrace from "potrace";
import { withTimeout } from "../utils/withTimeout";
import { env } from "../config/env";
import { logger } from "../config/logger";

export async function convertVectorize(
    inputPath: string,
    options: {
        resize?: { width: number; height: number };
        backgroundColor?: string;
        threshold?: number;
    } = {},
    requestId?: string
): Promise<string> {
    const { resize = { width: 512, height: 512 }, backgroundColor = "#ffffff", threshold = 120 } = options;

    const tempDir = path.dirname(inputPath);
    const tempPngPath = path.join(tempDir, `temp_${Date.now()}.png`);
    const startTime = Date.now();

    logger.debug("Iniciando vetorização de imagem", {
        requestId,
        inputPath,
        resize,
        backgroundColor,
        threshold
    });

    try {
        // 1. Processar imagem com Sharp
        await withTimeout(
            sharp(inputPath)
                .resize({
                    width: resize.width,
                    height: resize.height,
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .flatten({ background: backgroundColor })
                .toFile(tempPngPath),
            env.IMAGE_PROCESSING_TIMEOUT_MS,
            'Image preprocessing for vectorization'
        );

        // 2. Vetorizar com Potrace
        const svg = await withTimeout(
            new Promise<string>((resolve, reject) => {
                potrace.trace(
                    tempPngPath,
                    {
                        background: "transparent",
                        color: "black",
                        threshold,
                    },
                    (err: Error | null, svg: string) => {
                        if (err) reject(err);
                        else resolve(svg);
                    }
                );
            }),
            env.IMAGE_PROCESSING_TIMEOUT_MS,
            'Image vectorization'
        );

        const duration = Date.now() - startTime;
        logger.info("Imagem vetorizada com sucesso", {
            requestId,
            inputPath,
            svgLength: svg.length,
            duration
        });

        return svg;
    } catch (err) {
        const duration = Date.now() - startTime;
        logger.error("Erro ao vetorizar imagem", {
            requestId,
            inputPath,
            duration,
            error: err instanceof Error ? err.message : String(err)
        });
        throw err;
    } finally {
        await fs.unlink(tempPngPath).catch(() => {});
    }
}
