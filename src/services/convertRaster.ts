import sharp from "sharp";

export async function convertRaster(
    inputPath: string,
    outputPath: string,
    format: "jpeg" | "png" | "webp" | "avif" | "tiff"
): Promise<void> {
    sharp.cache(false);
    await sharp(inputPath).toFormat(format).toFile(outputPath);
}
