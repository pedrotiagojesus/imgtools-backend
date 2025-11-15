import { z } from 'zod';

/**
 * Schema de validação para criação de PDF
 */
export const pdfSchema = z.object({
    pdfTitle: z
        .string()
        .min(1, 'Título do PDF é obrigatório')
        .max(100, 'Título do PDF deve ter no máximo 100 caracteres')
        .optional()
        .default('IMGTOOLS'),

    pdfAuthor: z
        .string()
        .max(100, 'Autor do PDF deve ter no máximo 100 caracteres')
        .optional()
        .default('IMGTOOLS'),

    pdfSubject: z
        .string()
        .max(200, 'Assunto do PDF deve ter no máximo 200 caracteres')
        .optional()
        .default(''),

    pdfCreator: z
        .string()
        .max(100, 'Criador do PDF deve ter no máximo 100 caracteres')
        .optional()
        .default('IMGTOOLS')
});

export type PdfInput = z.infer<typeof pdfSchema>;
