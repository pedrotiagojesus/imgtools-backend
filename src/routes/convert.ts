import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { convertPngToSvg } from "../services/pngToSvg";

const router = express.Router();

const uploadDir = path.join(__dirname, "../../", process.env.UPLOAD_DIR || "uploads");

const upload = multer({
    dest: uploadDir,
});

router.post("/", upload.single("image"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    try {
        const svg = await convertPngToSvg(req.file.path);
        res.setHeader("Content-Disposition", 'attachment; filename="converted.svg"');
        res.setHeader("Content-Type", "image/svg+xml");
        res.send(svg);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to convert image" });
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

export default router;
