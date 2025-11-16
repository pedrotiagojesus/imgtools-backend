import path from "path";
import fs from "fs";
import { logger } from "../config/logger";

/**
 * Single temporary directory for all file operations
 * Simplifies file management by using one location for uploads and outputs
 */
export const TEMP_DIR = path.join(__dirname, "../../tmp");

// Backward compatibility aliases
export const UPLOADS_DIR = TEMP_DIR;
export const OUTPUT_DIR = TEMP_DIR;

/**
 * Generates the temporary directory if it does not exist
 */
export async function generate() {
    try {
        await fs.promises.mkdir(TEMP_DIR, { recursive: true });
        logger.debug("Temporary directory ready", { path: TEMP_DIR });
    } catch (err) {
        logger.error("Erro ao criar pasta temporária", {
            folder: TEMP_DIR,
            error: err instanceof Error ? err.message : String(err)
        });
    }
}

/**
 * Clears all files from the temporary directory
 * Keeps the directory itself but removes all contents
 */
export async function remove() {
    try {
        const files = await fs.promises.readdir(TEMP_DIR);

        for (const file of files) {
            const filePath = path.join(TEMP_DIR, file);
            try {
                const stat = await fs.promises.stat(filePath);
                if (stat.isDirectory()) {
                    await fs.promises.rm(filePath, { recursive: true, force: true });
                } else {
                    await fs.promises.unlink(filePath);
                }
            } catch (err) {
                // Ignora erros individuais de arquivos
                logger.debug("Erro ao remover arquivo", {
                    file: filePath,
                    error: err instanceof Error ? err.message : String(err)
                });
            }
        }

        logger.debug("Temporary directory cleaned", { path: TEMP_DIR });
    } catch (err) {
        // Ignora erro se pasta não existir
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
            logger.warn("Erro ao limpar pasta temporária", {
                folder: TEMP_DIR,
                error: err instanceof Error ? err.message : String(err)
            });
        }
    }
}
