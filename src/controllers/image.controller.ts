import { Response, NextFunction } from 'express';
import path from 'path';

// Types
import { AppRequest } from '../types/request.types';
import { ResizeInput } from '../schemas/resize.schema';
import { DpiInput } from '../schemas/dpi.schema';
import { ConvertInput } from '../schemas/convert.schema';

// Services
import { resizeImage } from '../services/resizeImage';
import { adjustDpi } from '../services/adjustDpi';
import { convertRaster } from '../services/convertRaster';
import { convertVectorize } from '../services/convertVectorize';

// Utils
import { tempFileManager } from '../utils/tempFileManager';
import { OUTPUT_DIR } from '../utils/directories';
import { sendImageResponse } from '../utils/imageResponse';
import { isVectorizable } from '../utils/validators';

// Errors
import { ValidationError } from '../errors';

/**
 * Controller para operações de processamento de imagens
 * Otimizado para processamento paralelo
 */
export class ImageController {
    /**
     * Redimensiona uma ou múltiplas imagens
     * Processa todas as imagens em paralelo para melhor performance
     */
    async resize(
        req: AppRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
                throw new ValidationError('Nenhuma imagem enviada.');
            }

            const { width, height, zip } = req.body;
            const requestId = req.requestId;

            // Register uploaded files for cleanup
            req.files.forEach(file => tempFileManager.add(file.path, requestId));

            // ⚡ Process all images in parallel
            const processPromises = req.files.map(async (file, index) => {
                const ext = path.extname(file.originalname) || '.jpg';
                const outputImagePath = path.join(OUTPUT_DIR, `image-${index + 1}${ext}`);

                await resizeImage(
                    file.path,
                    outputImagePath,
                    { width, height },
                    requestId
                );

                tempFileManager.add(outputImagePath, requestId);
                return outputImagePath;
            });

            const outputFiles = await Promise.all(processPromises);

            await sendImageResponse(res, outputFiles, zip === 'true');
        } catch (err) {
            next(err);
        }
    }

    /**
     * Ajusta o DPI de uma ou múltiplas imagens
     * Processa todas as imagens em paralelo para melhor performance
     */
    async adjustDpi(
        req: AppRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
                throw new ValidationError('Nenhuma imagem enviada.');
            }

            const { dpi, zip } = req.body;
            const requestId = req.requestId;

            // Register uploaded files for cleanup
            req.files.forEach(file => tempFileManager.add(file.path, requestId));

            // ⚡ Process all images in parallel
            const processPromises = req.files.map(async (file, index) => {
                const ext = path.extname(file.originalname) || '.jpg';
                const outputImagePath = path.join(OUTPUT_DIR, `image-${index + 1}${ext}`);

                await adjustDpi(
                    file.path,
                    outputImagePath,
                    { dpi },
                    requestId
                );

                tempFileManager.add(outputImagePath, requestId);
                return outputImagePath;
            });

            const outputFiles = await Promise.all(processPromises);

            await sendImageResponse(res, outputFiles, zip === 'true');
        } catch (err) {
            next(err);
        }
    }

    /**
     * Converte imagens para diferentes formatos
     * Processa todas as imagens em paralelo para melhor performance
     */
    async convert(
        req: AppRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
                throw new ValidationError('Nenhuma imagem enviada.');
            }

            const { format, zip } = req.body;
            const requestId = req.requestId;

            // Register uploaded files for cleanup
            req.files.forEach(file => tempFileManager.add(file.path, requestId));

            // ⚡ Process all images in parallel
            const processPromises = req.files.map(async (file, index) => {
                const baseName = `image-${index + 1}.${format}`;
                const outputPath = path.join(OUTPUT_DIR, baseName);

                if (format === 'svg') {
                    if (!isVectorizable(file.mimetype)) {
                        return null; // Skip non-vectorizable images
                    }

                    const svg = await convertVectorize(
                        file.path,
                        {
                            resize: { width: 800, height: 600 },
                            backgroundColor: '#ffffff',
                            threshold: 180,
                        },
                        requestId
                    );

                    await require('fs').promises.writeFile(outputPath, svg, 'utf-8');
                } else {
                    await convertRaster(file.path, outputPath, format as any, requestId);
                }

                tempFileManager.add(outputPath, requestId);
                return outputPath;
            });

            const results = await Promise.all(processPromises);
            const outputFiles = results.filter((path): path is string => path !== null);

            await sendImageResponse(res, outputFiles, zip === 'true');
        } catch (err) {
            next(err);
        }
    }
}

// Export singleton instance
export const imageController = new ImageController();
