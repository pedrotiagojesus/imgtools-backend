import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Services
import { dpiAjust } from "../services/dpiAjust";

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

    const { dpi } = req.body;

    if (!dpi) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "DPI required" });
    }

    const { filename, fullPath } = generateOutputPath(req.file.originalname);

    try {
        await dpiAjust(req.file.path, fullPath, {
            dpi: parseInt(dpi),
        });

        if (!fs.existsSync(fullPath)) {
            throw new Error("Ficheiro de saída não foi criado");
        }

        sendFileAndCleanup(res, fullPath, filename);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to ajust dpi image" });
    }
});

export default router;
