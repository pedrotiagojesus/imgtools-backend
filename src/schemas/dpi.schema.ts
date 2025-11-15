import { z } from 'zod';
import { VALIDATION_LIMITS } from '../utils/validators';

/**
 * Schema de validação para ajuste de DPI
 */
export const dpiSchema = z.object({
    dpi: z
        .string()
        .regex(/^\d+$/, 'DPI deve conter apenas números')
        .transform(Number)
        .refine(
            (val) => val >= VALIDATION_LIMITS.DPI.MIN && val <= VALIDATION_LIMITS.DPI.MAX,
            {
                message: `DPI deve estar entre ${VALIDATION_LIMITS.DPI.MIN} e ${VALIDATION_LIMITS.DPI.MAX}`
            }
        ),

    zip: z
        .enum(['true', 'false'])
        .optional()
        .default('false')
});

export type DpiInput = z.infer<typeof dpiSchema>;
