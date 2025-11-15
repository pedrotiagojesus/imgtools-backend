import { z } from 'zod';
import { VALIDATION_LIMITS } from '../utils/validators';

/**
 * Schema de validação para redimensionamento de imagens
 */
export const resizeSchema = z.object({
    width: z
        .string()
        .regex(/^\d+$/, 'Largura deve conter apenas números')
        .transform(Number)
        .refine(
            (val) => val >= VALIDATION_LIMITS.DIMENSION.MIN && val <= VALIDATION_LIMITS.DIMENSION.MAX,
            {
                message: `Largura deve estar entre ${VALIDATION_LIMITS.DIMENSION.MIN} e ${VALIDATION_LIMITS.DIMENSION.MAX} pixels`
            }
        )
        .optional(),

    height: z
        .string()
        .regex(/^\d+$/, 'Altura deve conter apenas números')
        .transform(Number)
        .refine(
            (val) => val >= VALIDATION_LIMITS.DIMENSION.MIN && val <= VALIDATION_LIMITS.DIMENSION.MAX,
            {
                message: `Altura deve estar entre ${VALIDATION_LIMITS.DIMENSION.MIN} e ${VALIDATION_LIMITS.DIMENSION.MAX} pixels`
            }
        )
        .optional(),

    zip: z
        .enum(['true', 'false'])
        .optional()
        .default('false')
}).refine(
    (data) => data.width !== undefined || data.height !== undefined,
    {
        message: 'Pelo menos largura ou altura deve ser fornecida'
    }
);

export type ResizeInput = z.infer<typeof resizeSchema>;
