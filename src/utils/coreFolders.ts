import path from "path";
import fs from "fs";

export const UPLOADS_DIR = path.join(__dirname, "../../tmp/upload");
export const OUTPUT_DIR = path.join(__dirname, "../../tmp/output");

const folders = [UPLOADS_DIR, OUTPUT_DIR];

// Generates the necessary directories if they do not exist
export async function generate() {
    for (const folder of folders) {
        try {
            await fs.promises.mkdir(folder, { recursive: true });
        } catch (err) {
            console.error(`Erro ao criar pasta: ${folder}`, err);
        }
    }
}

// Removes the directories and their contents
// This is useful for cleaning up temporary files after processing
export async function remove() {
    const foldersToRemove = [
        path.join(__dirname, "../../tmp/upload"),
        path.join(__dirname, "../../tmp/output"),
        path.join(__dirname, "../../tmp/zips"),
    ];

    for (const folder of foldersToRemove) {
        const fullPath = path.join(__dirname, folder);
        try {
            await fs.promises.rm(fullPath, { recursive: true, force: true });
        } catch (err) {
            // Ignora erro se pasta não existir
        }
    }
}
