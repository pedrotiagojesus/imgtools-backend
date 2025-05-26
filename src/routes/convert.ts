import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { convertRaster } from "../services/convertRaster";
import { convertVectorize } from "../services/convertVectorize";

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "../../uploads/") });

router.post("/", upload.array("images"), async (req, res) => {
    const { format } = req.body;

    if (!format) return res.status(400).json({ error: "Formato de saída não especificado." });
    if (!req.files || !(req.files instanceof Array)) {
        return res.status(400).json({ error: "Nenhuma imagem enviada." });
    }

    const allowedFormats = ["jpeg", "png", "webp", "tiff", "avif", "svg"];
    if (!allowedFormats.includes(format)) {
        return res.status(400).json({ error: "Formato inválido." });
    }

    const timestamp = Date.now();
    const outputDir = path.join(__dirname, "../../outputs", `${timestamp}`);
    const zipPath = path.join(__dirname, "../../zips", `converted-${timestamp}.zip`);
    fs.mkdirSync(outputDir, { recursive: true });

    const uploadedPaths = req.files.map(file => file.path);

    try {
        await Promise.all(
            req.files.map(async (file, index) => {
                const baseName = `image-${index + 1}`;
                const outputPath = path.join(outputDir, `${baseName}.${format}`);

                if (format === "svg") {

                    if (!["image/png", "image/jpeg"].includes(file.mimetype)) {
                        throw new Error("Só PNG ou JPEG podem ser vetorizados em SVG.");
                    }

                    const svg = await convertVectorize(file.path, {
                        resize: { width: 800, height: 600 },
                        backgroundColor: '#f0f0f0',
                        threshold: 150
                    });

                    fs.writeFileSync(outputPath, svg, "utf-8");
                } else {
                    await convertRaster(file.path, outputPath, format as any);
                }

                fs.unlink(file.path, () => {});
            })
        );

        // Cria ZIP
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.pipe(output);
        archive.directory(outputDir, false);
        await archive.finalize();

        output.on("close", () => {
            res.download(zipPath, () => {
                fs.rmSync(outputDir, { recursive: true, force: true });
                fs.unlink(zipPath, () => {});
            });
        });
    } catch (err) {
        console.error("Erro ao converter imagens:", err);
        res.status(500).json({ error: "Erro ao converter imagens." });
    } finally {
        // 🔥 Limpa sempre os ficheiros temporários da pasta "uploads/"
        uploadedPaths.forEach((filePath) => {
            fs.unlink(filePath, (err) => {
                if (err) console.warn("Erro ao apagar temporário:", filePath, err.message);
            });
        });
    }
});

export default router;
