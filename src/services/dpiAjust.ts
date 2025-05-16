import sharp from "sharp";

interface DpiOptions {
    dpi?: number;
}

export async function dpiAjust(inputPath: string, outputPath: string, options: DpiOptions): Promise<void> {
    const { dpi } = options;

    if (!dpi || dpi <= 0) {
        throw new Error("Invalid DPI value");
    }

    await sharp(inputPath).withMetadata({ density: dpi }).toFile(outputPath);
}
