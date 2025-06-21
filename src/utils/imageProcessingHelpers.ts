import path from "path";
import fs from "fs";
import archiver from "archiver";

const createOutputPaths = (baseDir: string = __dirname) => {
    const timestamp = Date.now();

    const outputDir = path.join(baseDir, "../../outputs", `${timestamp}`);
    const zipDir = path.join(baseDir, "../../zips");
    const zipPath = path.join(zipDir, `converted-${timestamp}.zip`);

    const pdfPath = path.join(outputDir, `output.pdf`);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(zipDir, { recursive: true });

    return { outputDir, zipDir, zipPath, pdfPath };
}

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
