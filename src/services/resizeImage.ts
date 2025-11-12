import sharp from "sharp";
import { withTimeout } from "../utils/withTimeout";
import { env } from "../config/env";

interface ResizeOptions {
    width?: number;
    height?: number;
}

export async function resizeImage(inputPath: string, outputPath: string, options: ResizeOptions): Promise<void> {

    const { width, height } = options;

    console.log("🔧 A redimensionar imagem...");
    console.log("📥 Entrada:", inputPath);
    console.log("📤 Saída:", outputPath);
    console.log("📐 Largura:", width, " Altura:", height);

    try {
        sharp.cache(false);

        await withTimeout(
            sharp(inputPath)
                .resize({ width, height, fit: "inside" })
                .toFile(outputPath),
            env.IMAGE_PROCESSING_TIMEOUT_MS,
            'Image resize'
        );
        console.log("✅ Imagem redimensionada com sucesso!");
    } catch (err) {
        console.error("❌ Erro ao redimensionar imagem:", err);
        throw err;
    }
}
