import fs from "fs/promises";
import { logger } from "../config/logger";

/**
 * Extensões de imagem suportadas para PDF
 */
type SupportedImageExtension = "png" | "jpg";

/**
 * Magic bytes para validação de PDF
 * PDFs começam com %PDF-
 */
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF-

/**
 * Tamanho mínimo razoável para um PDF (em bytes)
 * Um PDF vazio tem pelo menos ~200 bytes
 */
const MIN_PDF_SIZE = 200;

/**
 * Extrai a extensão de uma imagem a partir do caminho do ficheiro
 * @param filePath - Caminho do ficheiro
 * @returns Extensão da imagem ou null se não for suportada
 */
export function getImageExtension(filePath: string): SupportedImageExtension | null {
    if (!filePath || typeof filePath !== "string") {
        return null;
    }

    const ext = filePath.toLowerCase();

    if (ext.endsWith(".png")) {
        return "png";
    }

    if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) {
        return "jpg";
    }

    return null;
}

/**
 * Valida se um ficheiro PDF foi criado corretamente
 * Verifica:
 * - Se o ficheiro existe
 * - Se tem tamanho mínimo razoável
 * - Se começa com magic bytes de PDF (%PDF-)
 *
 * @param pdfPath - Caminho do ficheiro PDF
 * @param requestId - ID da requisição para logging (opcional)
 * @throws Error se o PDF não for válido
 */
export async function validatePdfOutput(pdfPath: string, requestId?: string): Promise<void> {
    try {
        // Verificar se o ficheiro existe e obter stats
        const stats = await fs.stat(pdfPath);

        // Verificar tamanho mínimo
        if (stats.size < MIN_PDF_SIZE) {
            logger.error("PDF criado com tamanho inválido", {
                requestId,
                pdfPath,
                size: stats.size,
                minSize: MIN_PDF_SIZE
            });
            throw new Error(`PDF tem tamanho inválido: ${stats.size} bytes (mínimo: ${MIN_PDF_SIZE} bytes)`);
        }

        // Ler os primeiros bytes para validar magic bytes
        const fileHandle = await fs.open(pdfPath, 'r');
        try {
            const buffer = Buffer.alloc(PDF_MAGIC_BYTES.length);
            await fileHandle.read(buffer, 0, PDF_MAGIC_BYTES.length, 0);

            // Verificar se começa com %PDF-
            if (!buffer.equals(PDF_MAGIC_BYTES)) {
                logger.error("PDF criado com formato inválido", {
                    requestId,
                    pdfPath,
                    expectedMagicBytes: PDF_MAGIC_BYTES.toString('hex'),
                    actualMagicBytes: buffer.toString('hex')
                });
                throw new Error("PDF não tem formato válido (magic bytes incorretos)");
            }
        } finally {
            await fileHandle.close();
        }

        logger.debug("PDF validado com sucesso", {
            requestId,
            pdfPath,
            size: stats.size
        });

    } catch (error) {
        // Se o erro já foi lançado por nós, re-lançar
        if (error instanceof Error && error.message.includes("PDF")) {
            throw error;
        }

        // Erro ao acessar o ficheiro
        logger.error("Erro ao validar PDF", {
            requestId,
            pdfPath,
            error: error instanceof Error ? error.message : String(error)
        });

        throw new Error(`Erro ao validar PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
}
