import sharp from "sharp";
import path from "path";
import { withTimeout } from "../utils/withTimeout";
import { env } from "../config/env";

interface DpiOptions {
    dpi?: number;
}

export async function dpiAjust(inputPath: string, outputPath: string, options: DpiOptions): Promise<void> {
    const { dpi } = options;

    if (!dpi || dpi <= 0) {
        throw new Error("Valor de DPI inválido");
    }

    const ext = path.extname(outputPath).toLowerCase();
    const supported = [".jpg", ".jpeg", ".png", ".tiff"];

    if (!supported.includes(ext)) {
        throw new Error(`O formato ${ext} não suporta metadados de DPI.`);
    }

    await withTimeout(
        sharp(inputPath).withMetadata({ density: dpi }).toFile(outputPath),
        env.IMAGE_PROCESSING_TIMEOUT_MS,
        'DPI adjustment'
    );

    console.log(`🖨️ DPI ajustado para ${dpi} → ${outputPath}`);
}
