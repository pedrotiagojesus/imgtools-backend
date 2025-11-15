import fs from "fs";
import path from "path";
import { createZip, getZipPath, getBase64FileBuffers } from "./imageProcessingHelpers";
import { OUTPUT_DIR } from "./directories";
import { Response } from "express";
import { tempFileManager } from "./tempFileManager";
import { logger } from "../config/logger";

export async function sendImageResponse(res: Response, outputFiles: string[], asZip: boolean) {
    const requestId = (res.req as any).requestId;

    logger.debug("Enviando resposta de imagem", {
        requestId,
        format: asZip ? "ZIP" : "Base64 JSON",
        fileCount: outputFiles.length
    });

    if (asZip) {
        await createZip();

        const zipPath = getZipPath();
        if (!fs.existsSync(zipPath)) {
            return res.status(500).json({ error: "ZIP não foi gerado corretamente." });
        }

        tempFileManager.add(zipPath);

        return res.download(zipPath, () => {
            fs.unlink(zipPath, err => {
                if (err) {
                    logger.warn("Erro ao remover ZIP", {
                        requestId,
                        zipPath,
                        error: err.message
                    });
                }
            });
        });
    } else {
        const buffers = getBase64FileBuffers(outputFiles);
        outputFiles.forEach(filePath => tempFileManager.add(filePath));
        return res.json({ files: buffers });
    }
}
