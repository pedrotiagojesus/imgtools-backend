import path from "path";
import fs from "fs";
import archiver from "archiver";
import { OUTPUT_DIR, ZIPS_DIR } from "./coreFolders";

/**
 * Creates output paths for processed files.
 * @returns {Object} An object containing the output directory, zip path, and PDF path.
 */
const createOutputPaths = () => {
    const timestamp = Date.now();

    const outputDir = path.join(OUTPUT_DIR, `${timestamp}`);
    const zipPath = path.join(ZIPS_DIR, `converted-${timestamp}.zip`);

    const pdfPath = path.join(outputDir, `output.pdf`);

    return { outputDir, zipPath, pdfPath };
};

/**
 * Creates a zip file from the specified output directory.
 * @param {string} zipPath - The path where the zip file will be created.
 * @param {string} outputDir - The directory containing files to be zipped.
 * @returns {Promise<void>} A promise that resolves when the zip file is created.
 */
const createZip = (zipPath: string, outputDir: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", resolve);
        archive.on("error", reject);

        archive.pipe(output);
        archive.directory(outputDir, false);
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

export { createOutputPaths, createZip, getBase64FileBuffers };
