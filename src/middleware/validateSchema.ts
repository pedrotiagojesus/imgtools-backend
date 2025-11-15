import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../errors';
import { logger } from '../config/logger';

/**
 * Middleware factory para validar request body com Zod schemas
 *
 * @param schema - Zod schema para validação
 * @returns Express middleware
 *
 * @example
 * router.post('/', validateSchema(resizeSchema), async (req, res) => {
 *   // req.body já está validado e tipado
 * });
 */
export function validateSchema<T extends z.ZodType>(schema: T) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Valida e transforma o body
            const validated = schema.parse(req.body);

            // Substitui req.body pelo valor validado e transformado
            req.body = validated;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const requestId = (req as any).requestId;

                // Formata erros do Zod de forma amigável
                const errors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));

                logger.warn('Validação de schema falhou', {
                    requestId,
                    path: req.path,
                    errors
                });

                // Retorna o primeiro erro (mais simples para o cliente)
                const firstError = errors[0];
                next(new ValidationError(firstError.message));
            } else {
                next(error);
            }
        }
    };
}
