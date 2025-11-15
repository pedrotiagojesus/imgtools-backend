/**
 * Formatos de imagem suportados para conversão
 */
const SUPPORTED_FORMATS = ["jpeg", "png", "webp", "tiff", "avif", "svg"] as const;

/**
 * Tipos MIME suportados para imagens
 */
const SUPPORTED_IMAGE_MIMETYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
    "image/avif"
] as const;

/**
 * Tipos MIME que podem ser vetorizados
 */
const VECTORIZABLE_MIMETYPES = ["image/png", "image/jpeg"] as const;

/**
 * Limites de DPI
 */
const DPI_LIMITS = {
    MIN: 72,
    MAX: 2400
} as const;

/**
 * Limites de dimensões de imagem
 */
const DIMENSION_LIMITS = {
    MIN: 1,
    MAX: 50000 // 50k pixels
} as const;

/**
 * Valida se o formato de imagem é suportado
 * @param format - Formato da imagem (jpeg, png, webp, etc.)
 * @returns true se o formato é válido
 */
export const isValidFormat = (format: string): boolean => {
    if (!format || typeof format !== "string") {
        return false;
    }
    return SUPPORTED_FORMATS.includes(format.toLowerCase() as any);
};

/**
 * Valida se o tipo MIME pode ser vetorizado
 * @param mimetype - Tipo MIME da imagem
 * @returns true se a imagem pode ser vetorizada
 */
export const isVectorizable = (mimetype: string): boolean => {
    if (!mimetype || typeof mimetype !== "string") {
        return false;
    }
    return VECTORIZABLE_MIMETYPES.includes(mimetype.toLowerCase() as any);
};

/**
 * Valida se o valor de DPI está dentro dos limites aceitáveis (72-2400)
 * @param value - Valor de DPI como string
 * @returns true se o DPI é válido
 */
export const isValidDPI = (value: string | undefined): boolean => {
    if (!value || typeof value !== "string") {
        return false;
    }

    const dpi = parseInt(value, 10);

    if (isNaN(dpi)) {
        return false;
    }

    return dpi >= DPI_LIMITS.MIN && dpi <= DPI_LIMITS.MAX;
};

/**
 * Valida se o tipo MIME é uma imagem suportada
 * @param mimetype - Tipo MIME da imagem
 * @returns true se o tipo MIME é suportado
 */
export const isSupportedImageType = (mimetype: string): boolean => {
    if (!mimetype || typeof mimetype !== "string") {
        return false;
    }
    return SUPPORTED_IMAGE_MIMETYPES.includes(mimetype.toLowerCase() as any);
};

/**
 * Valida se a dimensão (largura ou altura) é válida
 * @param value - Valor da dimensão como string
 * @returns true se a dimensão é válida ou undefined
 */
export const isValidDimension = (value: string | undefined): boolean => {
    if (value === undefined) {
        return true;
    }

    if (typeof value !== "string") {
        return false;
    }

    const dimension = parseInt(value, 10);

    if (isNaN(dimension)) {
        return false;
    }

    return dimension >= DIMENSION_LIMITS.MIN && dimension <= DIMENSION_LIMITS.MAX;
};

/**
 * Valida se o formato é suportado para redimensionamento
 * @param format - Formato da imagem
 * @returns true se o formato é válido para redimensionamento
 */
export const isValidFormatResize = (format: string): boolean => {
    if (!format || typeof format !== "string") {
        return false;
    }

    const allowedFormats = ["jpeg", "png", "webp", "avif", "tiff"];
    return allowedFormats.includes(format.toLowerCase());
};

/**
 * Exporta os limites para uso em mensagens de erro
 */
export const VALIDATION_LIMITS = {
    DPI: DPI_LIMITS,
    DIMENSION: DIMENSION_LIMITS
} as const;
