import fs from "fs/promises";

export async function unlinkRetry(path: string, retries = 5, delay = 300): Promise<void> {
    for (let i = 0; i < retries; i++) {
        try {
            await fs.unlink(path);
            console.log(`✅ Ficheiro apagado: ${path}`);
            return;
        } catch (err: any) {
            if (i === retries - 1) {
                console.error(`❌ Erro permanente ao apagar ficheiro: ${path}`, err);
                return;
            }
            if (err.code === "EPERM" || err.code === "EBUSY") {
                console.warn(`⚠️ Tentativa ${i + 1}: ficheiro ainda bloqueado, a tentar novamente em ${delay}ms...`);
                await new Promise((res) => setTimeout(res, delay));
                delay *= 2; // espera mais a cada tentativa
            } else {
                throw err;
            }
        }
    }
}
