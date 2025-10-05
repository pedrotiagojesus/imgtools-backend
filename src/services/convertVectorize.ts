// src/services/convertVectorize.ts
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { Jimp, Bitmap } from "jimp";

export async function convertVectorize(
    inputPath: string,
    options: {
        resize?: { width: number; height: number };
        backgroundColor?: string;
        threshold?: number;
    } = {}
): Promise<string> {
    const { resize = { width: 512, height: 512 }, backgroundColor = "#ffffff", threshold = 120 } = options;

    const tempDir = path.dirname(inputPath);
    const tempPngPath = path.join(tempDir, `temp_${Date.now()}.png`);

    try {
        // 1. Processar imagem com Sharp
        await sharp(inputPath)
            .resize({
                width: resize.width,
                height: resize.height,
                fit: "inside",
                withoutEnlargement: true,
            })
            .flatten({ background: backgroundColor })
            .toFile(tempPngPath);

        // 2. Carregar com Jimp
        const image = await Jimp.read(tempPngPath);

        // 3. Vetorizar com Potrace
        const svg = await new Promise<string>((resolve, reject) => {
            require("potrace").trace(
                image.bitmap,
                {
                    background: "transparent",
                    color: "black",
                    threshold,
                },
                (err: Error, svg: string) => {
                    if (err) reject(err);
                    else resolve(svg);
                }
            );
        });

        return svg;
    } finally {
        await fs.unlink(tempPngPath).catch(() => {});
    }
}
