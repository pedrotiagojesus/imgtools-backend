import express from "express";
import fs from "fs";

// Services
import { createPdf } from "../services/createPdf";

// Utils
import { tempFileManager } from "../utils/tempFileManager";
import upload from "../utils/upload";
import { OUTPUT_DIR } from "../utils/coreFolders";
import path from "path";

const router = express.Router();

router.post("/", upload.array("images"), async (req, res) => {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }
    const { pdfTitle, pdfAuthor, pdfSubject, pdfCreator } = req.body;

    const pdfFilename = "images.pdf";
    const pdfPath = path.join(OUTPUT_DIR, pdfFilename);

    const validExtensions = [".png", ".jpg", ".jpeg"];
    for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!validExtensions.includes(ext)) {
            return res
                .status(400)
                .json({ error: `Formato não suportado: ${file.originalname}. Apenas PNG e JPG são permitidos.` });
        }
    }

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
        console.log("Antes do envio do PDF");
        res.send(pdfBuffer);
        return;
    } catch (err) {
        console.error("Erro ao criar PDF:", err);
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
