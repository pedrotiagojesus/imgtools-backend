import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Types
import { AppRequest } from '../types/request.types';
import { PdfInput } from '../schemas/pdf.schema';

// Services
import { createPdf } from '../services/createPdf';

// Utils
import { tempFileManager } from '../utils/tempFileManager';
import { OUTPUT_DIR } from '../utils/directories';

// Errors
import { ValidationError } from '../errors';

/**
 * Controller para operações relacionadas com PDF
 */
export class PdfController {
    /**
     * Cria um PDF a partir de múltiplas imagens
     */
    async createFromImages(
        req: AppRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
                throw new ValidationError('Nenhuma imagem enviada.');
            }

            const { pdfTitle, pdfAuthor, pdfSubject, pdfCreator } = req.body;
            const requestId = req.requestId;

            const pdfFilename = 'images.pdf';
            const pdfPath = path.join(OUTPUT_DIR, pdfFilename);

            // Validate file extensions
            const validExtensions = ['.png', '.jpg', '.jpeg'];
            const invalidFiles = req.files.filter((file) => {
                const ext = path.extname(file.originalname).toLowerCase();
                return !validExtensions.includes(ext);
            });

            if (invalidFiles.length > 0) {
                const names = invalidFiles.map((f) => f.originalname).join(', ');
                throw new ValidationError(
                    `Formatos não suportados: ${names}. Apenas PNG e JPG são permitidos.`
                );
            }

            // Register uploaded files for cleanup
            const imagePaths: string[] = [];
            req.files.forEach((file) => {
                imagePaths.push(file.path);
                tempFileManager.add(file.path, requestId);
            });

            // Create PDF
            await createPdf(
                imagePaths,
                pdfPath,
                pdfTitle,
                pdfAuthor,
                pdfSubject,
                pdfCreator,
                requestId
            );

            // Register output PDF for cleanup
            tempFileManager.add(pdfPath, requestId);

            // ⚡ Stream PDF response (faster, less memory)
            const fs = require('fs');
            const stat = await require('fs').promises.stat(pdfPath);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
            res.setHeader('X-Filename', pdfFilename);
            res.setHeader('Content-Length', stat.size);

            const stream = fs.createReadStream(pdfPath);
            stream.pipe(res);
        } catch (err) {
            next(err);
        }
    }
}

// Export singleton instance
export const pdfController = new PdfController();
