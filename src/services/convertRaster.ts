import sharp from "sharp";
import { isValidFormat } from "../utils/validators";

export async function convertRaster(
    inputPath: string,
    outputPath: string,
    format: "jpeg" | "png" | "webp" | "avif" | "tiff"
): Promise<void> {
    if (!isValidFormat(format)) {
        throw new Error(`Formato inválido: ${format}`);
    }

    try {
        sharp.cache(false);
        await sharp(inputPath).toFormat(format).toFile(outputPath);
        console.log(`🖼️ Convertido: ${inputPath} → ${outputPath} (${format})`);
    } catch (err) {
        throw new Error(`Erro ao converter imagem: ${inputPath} → ${format}`);
    }
}
