import fs, { stat } from "fs/promises";

class TempFileManager {
    private files: string[] = [];

    add(filePath: string) {
        if (!this.files.includes(filePath)) {
            this.files.push(filePath);
        }
    }

    async remove(filePath: string) {
        try {
            const stats = await stat(filePath);
            if (!stats.isDirectory()) {
                await fs.unlink(filePath);
                console.log(`✅ Ficheiro apagado: ${filePath}`);
            } else {
                console.warn(`⚠️ ${filePath} é uma pasta, não será apagado com unlink.`);
            }
        } catch (err) {
            console.warn(`❌ Erro ao apagar ${filePath}:`, err);
        }
    }

    async cleanup() {
        console.log(`🧹 Limpeza iniciada: ${this.files.length} ficheiros`);
        for (const file of this.files) {
            await new Promise(resolve => setTimeout(resolve, 50));
            await this.remove(file);
        }
        this.files = [];
    }
}

export const tempFileManager = new TempFileManager();
