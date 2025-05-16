import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

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
        return res.status(200).json({ data: "PDF!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate PDF from images" });
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

export default router;
