import express from "express";
import fs from "fs";
import path from "path";

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
    const pdfFilename = "images.pdf";
    const pdfPath = path.join(OUTPUT_DIR, pdfFilename);

    const validExtensions = [".png", ".jpg", ".jpeg"];

    const invalidFiles = req.files.filter((file) => {
        const ext = path.extname(file.originalname).toLowerCase();
        return !validExtensions.includes(ext);
    });

    if (invalidFiles.length > 0) {
        const names = invalidFiles.map((f) => f.originalname).join(", ");
        return res.status(400).json({
            error: `Formatos não suportados: ${names}. Apenas PNG e JPG são permitidos.`,
        });
    }

    try {
        const imagePaths: string[] = [];

        req.files.forEach((file) => {
            imagePaths.push(file.path);
            tempFileManager.add(file.path);
            console.log(`✅ Imagem adicionada ao PDF: ${file.originalname}`);
        });

        await createPdf(imagePaths, pdfPath, pdfTitle, pdfAuthor, pdfSubject, pdfCreator);

        const pdfBuffer = await fs.promises.readFile(pdfPath);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${pdfFilename}"`);
        res.setHeader("X-Filename", pdfFilename);
        res.send(pdfBuffer);
    } catch (err) {
        console.error("Erro ao criar PDF:", err);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Erro ao criar pdf." });
        }
    } finally {
        tempFileManager.cleanup().catch((err) => console.error("Erro ao limpar ficheiros temporários:", err));
    }
});

export default router;
