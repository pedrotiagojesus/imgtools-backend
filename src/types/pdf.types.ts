/**
 * PDF related types
 */

/**
 * PDF metadata options
 */
export interface PdfMetadata {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
}

/**
 * PDF creation options
 */
export interface PdfCreationOptions extends PdfMetadata {
    imagePaths: string[];
    outputPath: string;
}
