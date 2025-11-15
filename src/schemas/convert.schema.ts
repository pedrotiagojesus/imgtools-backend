import { z } from 'zod';

/**
 * Schema de validação para conversão de imagens
 */
export const convertSchema = z.object({
    format: z.enum(['jpeg', 'jpg', 'png', 'webp', 'tiff', 'avif', 'svg']),

    zip: z
        .enum(['true', 'false'])
        .optional()
        .default('false')
});

export type ConvertInput = z.infer<typeof convertSchema>;
