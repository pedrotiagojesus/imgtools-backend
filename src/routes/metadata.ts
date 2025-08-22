import express from "express";
import multer from "multer";
import sharp from "sharp";

const router = express.Router();
const upload = multer();

router.post("/", upload.single("image"), async (req, res) => {
    try {
        const buffer = req.file?.buffer;
        if (!buffer) return res.status(400).json({ error: "No file uploaded" });

        const metadata = await sharp(buffer).metadata();
        const dpi = metadata.density || "Unknown";
        const width = metadata.width || "Unknown";
        const height = metadata.height || "Unknown";
        const format = metadata.format || "Unknown";

        return res.json({ format, width, height, dpi });
    } catch (error) {
        console.error("Error extracting metadata:", error);
        return res.status(500).json({ error: "Failed to extract metadata" });
    }
});

export default router;
