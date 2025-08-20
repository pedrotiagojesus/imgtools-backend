import path from "path";
import fs from "fs";

export const UPLOADS_DIR = path.join(__dirname, "../../tmp/uploads");
export const OUTPUT_DIR = path.join(__dirname, "../../tmp/output");
export const ZIPS_DIR = path.join(__dirname, "../../tmp/zips");

const folders = [UPLOADS_DIR, OUTPUT_DIR, ZIPS_DIR];

// Generates the necessary directories if they do not exist
export function generate() {
    folders.forEach((folder) => {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
    });
};

// Removes the directories and their contents
// This is useful for cleaning up temporary files after processing
export function remover() {
    const folders = ["uploads", "outputs", "zips"];
    folders.forEach((folder) => {
        const fullPath = path.join(__dirname, `../../${folder}`);
        if (fs.existsSync(fullPath)) {
            fs.rmdirSync(fullPath, { recursive: true });
            console.log(`Pasta removida: ${fullPath}`);
        }
    });
}