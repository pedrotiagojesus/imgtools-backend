export const isValidFormat = (format: string): boolean =>
    ["jpeg", "png", "webp", "tiff", "avif", "svg"].includes(format);

export const isVectorizable = (mimetype: string): boolean => ["image/png", "image/jpeg"].includes(mimetype);

export const isValidDPI = (value: string): boolean => {
    const dpi = parseInt(value);
    return !isNaN(dpi) && dpi > 0;
};

export const isSupportedImageType = (mimetype: string): boolean =>
    ["image/jpeg", "image/png", "image/webp", "image/tiff", "image/avif"].includes(mimetype);

export const isValidDimension = (value: string | undefined): boolean =>
    value === undefined || (!isNaN(parseInt(value)) && parseInt(value) > 0);

export const isValidFormatResize = (format: string): boolean => {
    const allowedFormats = ["jpeg", "png", "webp", "avif", "tiff"];
    return allowedFormats.includes(format);
};
