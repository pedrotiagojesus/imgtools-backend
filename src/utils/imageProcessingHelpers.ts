import path from "path";
import fs from "fs";
import archiver from "archiver";
import { OUTPUT_DIR } from "./coreFolders";

export const ZIP_FILENAME = "images.zip";

export const getZipPath = () => {
    return path.join(OUTPUT_DIR, ZIP_FILENAME);
};

export const createZip = (): Promise<void> => {
    const zipPath = getZipPath();

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => {
            console.log(`📦 ZIP criado: ${zipPath} (${archive.pointer()} bytes)`);
            resolve();
        });

        archive.on("error", reject);
        archive.pipe(output);
        archive.directory(OUTPUT_DIR, false);
        archive.finalize();
    });
};

export const getBase64FileBuffers = (filePaths: string[]) => {
    const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".avif": "image/avif",
        ".tiff": "image/tiff",
        ".svg": "image/svg+xml",
    };

    return filePaths.map((filePath) => {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Ficheiro não encontrado: ${filePath}`);
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeType = mimeTypes[ext] || "application/octet-stream";
        const data = fs.readFileSync(filePath);

        return {
            filename: path.basename(filePath),
            mimeType,
            data: data.toString("base64"),
        };
    });
};
