import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Services
import { resizeImage } from "../services/resizeImage";

// Utils
import { generateOutputPath } from "../utils/fileHandler";
import { sendFileAndCleanup } from "../utils/responseHandler";

const router = express.Router();

const uploadDir = path.join(__dirname, "../../", process.env.UPLOAD_DIR || "uploads");

const upload = multer({
    dest: uploadDir,
});

router.post("/", upload.single("image"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const { width, height } = req.body;

    if (!width && !height) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Width or height required" });
    }

    const { filename, fullPath } = generateOutputPath(req.file.originalname);

    try {
        await resizeImage(req.file.path, fullPath, {
            width: width ? parseInt(width) : undefined,
            height: height ? parseInt(height) : undefined,
        });

        sendFileAndCleanup(res, fullPath, filename);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to resize image" });
    }
});

export default router;
