import fs from "fs";
import path from "path";
import { createZip, getZipPath, getBase64FileBuffers } from "./imageProcessingHelpers";
import { OUTPUT_DIR } from "./coreFolders";
import { Response } from "express";
import { tempFileManager } from "./tempFileManager";

export async function sendImageResponse(res: Response, outputFiles: string[], asZip: boolean) {
    console.log(`📤 Enviando resposta como ${asZip ? "ZIP" : "Base64 JSON"}`);

    if (asZip) {
        await createZip();

        const zipPath = getZipPath();
        if (!fs.existsSync(zipPath)) {
            return res.status(500).json({ error: "ZIP não foi gerado corretamente." });
        }

        tempFileManager.add(zipPath);

        return res.download(zipPath, () => {
            fs.unlink(zipPath, err => {
                if (err) console.warn("⚠️ Erro ao remover ZIP:", err);
            });
        });
    } else {
        const buffers = getBase64FileBuffers(outputFiles);
        outputFiles.forEach(filePath => tempFileManager.add(filePath));
        return res.json({ files: buffers });
    }
}
