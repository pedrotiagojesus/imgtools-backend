/**
 * Image processing related types
 */

/**
 * Supported image formats for conversion
 */
export type ImageFormat = 'jpeg' | 'jpg' | 'png' | 'webp' | 'tiff' | 'avif' | 'svg';

/**
 * Supported raster image formats (excludes SVG)
 */
export type RasterFormat = Exclude<ImageFormat, 'svg'>;

/**
 * Image resize options
 */
export interface ResizeOptions {
    width?: number;
    height?: number;
}

/**
 * DPI adjustment options
 */
export interface DpiOptions {
    dpi: number;
}

/**
 * Image vectorization options
 */
export interface VectorizeOptions {
    resize?: {
        width: number;
        height: number;
    };
    backgroundColor?: string;
    threshold?: number;
}

/**
 * Image metadata
 */
export interface ImageMetadata {
    format: string;
    width: number;
    height: number;
    dpi: number;
    alpha: boolean;
    colorSpace: string;
}
