import fs from "fs";
import path from "path";
import { createZip, getZipPath, getBase64FileBuffers } from "./imageProcessingHelpers";
import { OUTPUT_DIR } from "./coreFolders";
import { Response } from "express";
import { tempFileManager } from "./tempFileManager";

export async function sendImageResponse(res: Response, outputFiles: string[], asZip: boolean) {
    if (asZip) {
        await createZip();
        return res.download(getZipPath(), () => {
            fs.readdirSync(OUTPUT_DIR).forEach((file) => {
                const filePath = path.join(OUTPUT_DIR, file);
                tempFileManager.add(filePath);
            });
            fs.unlink(getZipPath(), () => {});
        });
    } else {
        const buffers = getBase64FileBuffers(outputFiles);
        fs.readdirSync(OUTPUT_DIR).forEach((file) => {
            const filePath = path.join(OUTPUT_DIR, file);
            tempFileManager.add(filePath);
        });
        return res.json({ files: buffers });
    }
}
