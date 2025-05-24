import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { resizeImage } from "../services/resizeImage";
import { unlinkRetry } from "../utils/unlinkRetry";

const router = express.Router();

const upload = multer({
    dest: path.join(__dirname, "../../uploads/"),
});

router.post("/", upload.array("images"), async (req, res) => {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }

    const { width, height } = req.body;
    if (!width && !height) {
        return res.status(400).json({ error: "Width or height required" });
    }

    const timestamp = Date.now();
    const zipDir = path.join(__dirname, "../../zips");
    const outputDir = path.join(__dirname, "../../outputs", `${timestamp}`);
    const zipPath = path.join(zipDir, `resized-${timestamp}.zip`);

    try {
        fs.mkdirSync(outputDir, { recursive: true });

        // Redimensionar imagens
        await Promise.all(
            req.files.map(async (file, index) => {
                const ext = path.extname(file.originalname);
                const outputImagePath = path.join(outputDir, `image-${index + 1}${ext}`);
                await resizeImage(file.path, outputImagePath, {
                    width: width ? parseInt(width) : undefined,
                    height: height ? parseInt(height) : undefined,
                });
            })
        );

        await Promise.all(req.files.map(file => {unlinkRetry(file.path)}));

        // Criar ZIP
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => {
            res.download(zipPath, (err) => {
                if (err && !res.headersSent) {
                    res.status(500).json({ error: "Erro ao enviar o ficheiro ZIP." });
                }

                // Limpar arquivos temporários
                fs.rmSync(outputDir, { recursive: true, force: true });
                fs.unlink(zipPath, () => {});
            });
        });


        archive.on("error", (err) => {
            if (!res.headersSent) {
                res.status(500).json({ error: "Erro ao criar o ZIP." });
            }
        });

        archive.pipe(output);
        archive.directory(outputDir, false);
        archive.finalize();
    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ error: "Erro ao redimensionar imagens." });
        }
    }
});

export default router;
