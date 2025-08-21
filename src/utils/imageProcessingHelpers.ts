import path from "path";
import fs from "fs";
import archiver from "archiver";
import { OUTPUT_DIR } from "./coreFolders";

const getPdfPath = () => {
    return path.join(OUTPUT_DIR, `images.pdf`);
};

const getZipPath = () => {
    return path.join(OUTPUT_DIR, `images.zip`);
};

/**
 * Creates a zip file from the specified output directory.
 * @returns {Promise<void>} A promise that resolves when the zip file is created.
 */
const createZip = (): Promise<void> => {
    const zipPath = getZipPath();

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", resolve);
        archive.on("error", reject);

        archive.pipe(output);
        archive.directory(OUTPUT_DIR, false);
        archive.finalize();
    });
};

/**
 * Converts an array of file paths to base64 buffers.
 * @param {string[]} filePaths - An array of file paths to convert.
 * @returns {Object[]} An array of objects containing filename, mimeType, and base64 data.
 */
const getBase64FileBuffers = (filePaths: string[]) => {
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

export { getPdfPath, getZipPath, createZip, getBase64FileBuffers };
