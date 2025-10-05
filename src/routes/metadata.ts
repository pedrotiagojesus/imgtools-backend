import express from "express";
import multer from "multer";
import sharp from "sharp";
import { isSupportedImageType } from "../utils/validators";

const router = express.Router();
const upload = multer();

const safe = <T>(value: T | undefined | null, fallback: T): T => value ?? fallback;

router.post("/", upload.single("image"), async (req, res) => {
    try {
        const file = req.file;
        if (!file || !file.buffer) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        if (!isSupportedImageType(file.mimetype)) {
            return res.status(400).json({ error: "Unsupported file type" });
        }

        const metadata = await sharp(file.buffer).metadata();

        return res.json({
            format: safe(metadata.format, "Unknown"),
            width: safe(metadata.width, 0),
            height: safe(metadata.height, 0),
            dpi: safe(metadata.density, 0),
            alpha: safe(metadata.hasAlpha, false),
            colorSpace: safe(metadata.space, "Unknown"),
        });
    } catch (error) {
        console.error(
            `Erro ao extrair metadados${req.file?.originalname ? ` de ${req.file.originalname}` : ""}:`,
            error
        );
        return res.status(500).json({ error: "Failed to extract metadata" });
    }
});

export default router;
