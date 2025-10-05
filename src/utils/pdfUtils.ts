import fs from "fs/promises";

export function getImageExtension(filePath: string): "png" | "jpg" | null {
    const ext = filePath.toLowerCase();
    if (ext.endsWith(".png")) return "png";
    if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) return "jpg";
    return null;
}

export async function validatePdfOutput(pdfPath: string): Promise<void> {
    try {
        const stats = await fs.stat(pdfPath);
        if (stats.size === 0) {
            throw new Error("PDF não foi criado corretamente.");
        }
    } catch {
        throw new Error("PDF não foi criado corretamente.");
    }
}
