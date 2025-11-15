import express from "express";
import multer from "multer";
import sharp from "sharp";
import { isSupportedImageType } from "../utils/validators";
import { logger } from "../config/logger";

const router = express.Router();
const upload = multer();

const safe = <T>(value: T | undefined | null, fallback: T): T => value ?? fallback;

router.post("/", upload.single("image"), async (req, res, next) => {
    try {
        const file = req.file;
        if (!file || !file.buffer) {
            return res.status(400).json({ error: "Nenhuma imagem enviada." });
        }

        if (!isSupportedImageType(file.mimetype)) {
            return res.status(400).json({ error: "Tipo de ficheiro não suportado." });
        }

        const metadata = await sharp(file.buffer).metadata();

        return res.json({
            format: safe(metadata.format, "Desconhecido"),
            width: safe(metadata.width, 0),
            height: safe(metadata.height, 0),
            dpi: safe(metadata.density, 0),
            alpha: safe(metadata.hasAlpha, false),
            colorSpace: safe(metadata.space, "Desconhecido"),
        });
    } catch (error) {
        const requestId = (req as any).requestId;
        logger.error("Erro ao extrair metadados", {
            requestId,
            filename: req.file?.originalname,
            error: error instanceof Error ? error.message : String(error)
        });
        next(error);
    }
});

export default router;
