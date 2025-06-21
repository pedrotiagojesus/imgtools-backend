import fs, { stat } from "fs/promises";

class TempFileManager {
    private files: string[] = [];

    add(filePath: string) {
        this.files.push(filePath);
    }

    async cleanup() {
        for (const file of this.files) {
            try {
                const stats = await stat(file);
                if (stats.isDirectory()) {
                    console.warn(`⚠️ ${file} é uma pasta, não será apagado com unlink.`);
                    continue;
                }

                await new Promise((resolve) => setTimeout(resolve, 50));
                await fs.unlink(file);
                console.log(`✅ Ficheiro apagado: ${file}`);
            } catch (err) {
                console.warn(`❌ Erro ao apagar ${file}:`, err);
            }
        }
        this.files = [];
    }
}

export const tempFileManager = new TempFileManager();
