import sharp from "sharp";
import fs from "fs/promises";

interface ResizeOptions {
    width?: number;
    height?: number;
}

export async function resizeImage(inputPath: string, outputPath: string, options: ResizeOptions): Promise<void> {
    const { width, height } = options;

    await sharp(inputPath).resize(width, height).toFile(outputPath);

    // Limpa o ficheiro original
    await fs.unlink(inputPath);
}
