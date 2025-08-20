import express from "express";

// Utils
import { tempFileManager } from "../utils/tempFileManager";
import { createOutputPaths, createZip, getBase64FileBuffers } from "../utils/imageProcessingHelpers";
import upload from "../utils/upload";

const router = express.Router();

router.post("/generate-product", upload.array("images"), async (req, res) => {
    console.log("Etsy Tools - Generate Product");
    // try {
    //     const files = req.files as Express.Multer.File[];
    //     let processedPaths: string[] = [];

    //     for (const file of files) {
    //         // 1. Converter imagem
    //         // const convertedPath = await convertImage(file.path);

    //         // // 2. Resize
    //         // const resizedPath = await resizeImage(convertedPath);

    //         // // 3. Ajustar DPI
    //         // const dpiPath = await adjustDPI(resizedPath);

    //         // processedPaths.push(dpiPath);
    //     }

    //     // 4. Gerar PDF
    //     // const pdfPath = await imagesToPDF(processedPaths);

    //     res.json({ pdf: pdfPath });
    // } catch (err) {
    //     res.status(500).json({ error: "Erro ao processar imagens", details: err });
    // }
});

export default router;