import sharp from "sharp";
import path from "path";
import { withTimeout } from "../utils/withTimeout";
import { env } from "../config/env";
import { logger } from "../config/logger";

interface DpiOptions {
    dpi?: number;
}

export async function dpiAjust(
    inputPath: string,
    outputPath: string,
    options: DpiOptions,
    requestId?: string
): Promise<void> {
    const { dpi } = options;

    if (!dpi || dpi <= 0) {
        throw new Error("Valor de DPI inválido");
    }

    const ext = path.extname(outputPath).toLowerCase();
    const supported = [".jpg", ".jpeg", ".png", ".tiff"];

    if (!supported.includes(ext)) {
        throw new Error(`O formato ${ext} não suporta metadados de DPI.`);
    }

    const startTime = Date.now();

    try {
        await withTimeout(
            sharp(inputPath).withMetadata({ density: dpi }).toFile(outputPath),
            env.IMAGE_PROCESSING_TIMEOUT_MS,
            'DPI adjustment'
        );

        const duration = Date.now() - startTime;
        logger.info("DPI ajustado com sucesso", {
            requestId,
            inputPath,
            outputPath,
            dpi,
            duration
        });
    } catch (err) {
        const duration = Date.now() - startTime;
        logger.error("Erro ao ajustar DPI", {
            requestId,
            inputPath,
            dpi,
            duration,
            error: err instanceof Error ? err.message : String(err)
        });
        throw err;
    }
}
