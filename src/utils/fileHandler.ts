import path from "path";
import fs from "fs";

export function generateOutputPath(originalName: string): { filename: string; fullPath: string } {
    const ext = path.extname(originalName);
    const filename = `ajusted-${Date.now()}${ext}`;
    const fullPath = path.join(__dirname, "../../uploads/", filename);
    return { filename, fullPath };
}

export function deleteFile(filePath: string) {
    fs.unlink(filePath, (err) => {
        if (err) {
            console.warn(`Erro ao apagar ficheiro ${filePath}:`, err.message);
        }
    });
}
