import path from "path";
import fs from "fs";
import { logger } from "../config/logger";

/**
 * Directory paths for temporary file storage
 */
export const UPLOADS_DIR = path.join(__dirname, "../../tmp/upload");
export const OUTPUT_DIR = path.join(__dirname, "../../tmp/output");

const folders = [UPLOADS_DIR, OUTPUT_DIR];

/**
 * Generates the necessary directories if they do not exist
 * Creates upload and output directories for temporary file storage
 */
export async function generate() {
    for (const folder of folders) {
        try {
            await fs.promises.mkdir(folder, { recursive: true });
        } catch (err) {
            logger.error("Erro ao criar pasta", {
                folder,
                error: err instanceof Error ? err.message : String(err)
            });
        }
    }
}

/**
 * Removes the directories and their contents
 * This is useful for cleaning up temporary files after processing
 */
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
