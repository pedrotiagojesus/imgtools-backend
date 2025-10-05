import path from "path";

export const getTempPngPath = (inputPath: string): string => {
    const tempDir = path.dirname(inputPath);
    return path.join(tempDir, `temp_${Date.now()}.png`);
};
