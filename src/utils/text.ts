/**
 * Tamanho máximo para um slug
 */
const MAX_SLUG_LENGTH = 200;

/**
 * Slug padrão quando a entrada é inválida
 */
const DEFAULT_SLUG = "untitled";

/**
 * Converte uma string em slug (URL-friendly)
 * - Remove acentos
 * - Converte para minúsculas
 * - Remove caracteres especiais
 * - Substitui espaços por hífens
 * - Remove hífens consecutivos
 *
 * @param str - String para converter em slug
 * @param maxLength - Tamanho máximo do slug (padrão: 200)
 * @returns Slug gerado ou slug padrão se a entrada for inválida
 *
 * @example
 * slugify("Olá Mundo!") // "ola-mundo"
 * slugify("  Título com Espaços  ") // "titulo-com-espacos"
 * slugify("Café & Açúcar") // "cafe-acucar"
 */
export const slugify = (str: string | null | undefined, maxLength: number = MAX_SLUG_LENGTH): string => {
    // Validar entrada
    if (!str || typeof str !== "string") {
        return DEFAULT_SLUG;
    }

    // Converter para string e processar
    const slug = String(str)
        .normalize("NFKD") // split accented characters into their base characters and diacritical marks
        .replace(/[\u0300-\u036f]/g, "") // remove all the accents, which happen to be all in the \u03xx UNICODE block.
        .trim() // trim leading or trailing whitespace
        .toLowerCase() // convert to lowercase
        .replace(/[^a-z0-9 -]/g, "") // remove non-alphanumeric characters
        .replace(/\s+/g, "-") // replace spaces with hyphens
        .replace(/-+/g, "-") // remove consecutive hyphens
        .replace(/^-+|-+$/g, ""); // remove leading/trailing hyphens

    // Se o slug ficou vazio após processamento, retornar padrão
    if (!slug) {
        return DEFAULT_SLUG;
    }

    // Limitar tamanho
    if (slug.length > maxLength) {
        return slug.substring(0, maxLength).replace(/-+$/, ""); // remove trailing hyphen if cut in the middle
    }

    return slug;
};
