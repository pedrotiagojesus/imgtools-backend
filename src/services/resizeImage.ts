import sharp from "sharp";

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

        await sharp(inputPath)
            .resize({ width, height, fit: "inside" })
            .toFile(outputPath);
        console.log("✅ Imagem redimensionada com sucesso!");
    } catch (err) {
        console.error("❌ Erro ao redimensionar imagem:", err);
        throw err;
    }
}
