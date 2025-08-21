import express from "express";
import fs from "fs";

// Services
import { createPdf } from "../services/createPdf";

// Utils
import { tempFileManager } from "../utils/tempFileManager";
import upload from "../utils/upload";
import { OUTPUT_DIR } from "../utils/coreFolders";

const router = express.Router();

router.post("/", upload.array("images"), async (req, res) => {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }
    const { pdfTitle, pdfAuthor, pdfSubject, pdfCreator } = req.body;

    const pdfFilename = "output.pdf";

    try {
        const imagePaths: string[] = [];

        req.files.forEach((file) => {
            imagePaths.push(file.path);
            tempFileManager.add(file.path);
        });

        // Criar o PDF com todas as imagens
        await createPdf(imagePaths, OUTPUT_DIR, pdfTitle, pdfAuthor, pdfSubject, pdfCreator);

        const pdfBuffer = fs.readFileSync(OUTPUT_DIR);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${pdfFilename}"`);
        res.setHeader("X-Filename", pdfFilename);

        res.send(pdfBuffer);
        fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
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
