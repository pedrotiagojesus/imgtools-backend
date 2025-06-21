import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Services
import { createPdf } from "../services/createPdf";

// Utils
import { tempFileManager } from "../utils/tempFileManager";
import { createOutputPaths } from "../utils/imageProcessingHelpers";

const router = express.Router();

const upload = multer({
    dest: path.join(__dirname, "../../uploads/"),
});

router.post("/", upload.array("images"), async (req, res) => {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }
    const { pdfTitle, pdfAuthor, pdfSubject, pdfCreator } = req.body;

    const { outputDir, pdfPath } = createOutputPaths(__dirname);
    const pdfFilename = "output.pdf";

    try {
        const imagePaths: string[] = [];

        req.files.forEach((file) => {
            imagePaths.push(file.path);
            tempFileManager.add(file.path);
        });

        // Criar o PDF com todas as imagens
        await createPdf(imagePaths, pdfPath, pdfTitle, pdfAuthor, pdfSubject, pdfCreator);

        const pdfBuffer = fs.readFileSync(pdfPath);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${pdfFilename}"`);
        res.setHeader("X-Filename", pdfFilename);

        res.send(pdfBuffer);
        fs.rmSync(outputDir, { recursive: true, force: true });
    } catch (err) {
        if (!res.headersSent) {
            return res.status(500).json({ error: "Erro ao criar pdf." });
        }
    } finally {
        setImmediate(async () => {
            try {
                await tempFileManager.cleanup();
            } catch (err) {
                console.error("Erro ao limpar ficheiros temporários:", err);
            }
        });
    }
});

export default router;
