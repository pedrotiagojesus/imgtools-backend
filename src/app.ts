import express from "express";
import cors from "cors";

import dotenv from "dotenv";
dotenv.config();

// Utils
import { generate as generateCoreFolder, remove as removeCoreFolder } from "./utils/coreFolders";

const initFolders = async () => {
    try {
        await generateCoreFolder();
        await removeCoreFolder();
    } catch (error) {
        console.error("Erro ao preparar pastas:", error);
        throw error;
    }
};

const createServer = async () => {
    const app = express();
    const PORT = process.env.PORT || 4000;

    app.use(
        cors({
            origin: process.env.CORS_ORIGIN?.split(",") || "*",
        })
    );

    if (!process.env.CORS_ORIGIN) {
        console.warn("⚠️ CORS_ORIGIN não definido. Usando '*' como padrão.");
    }

    app.use(express.json());

    // Rotas
    const convertRoute = (await import("./routes/convert")).default;
    const resizeRoute = (await import("./routes/resize")).default;
    const pdfFromImagesRoute = (await import("./routes/pdf")).default;
    const dpiRoute = (await import("./routes/dpi")).default;
    const metadataRoute = (await import("./routes/metadata")).default;
    const etsytoolsRoute = (await import("./routes/etsytools")).default;

    app.use("/api/convert-image", convertRoute);
    app.use("/api/resize-image", resizeRoute);
    app.use("/api/pdf-from-images", pdfFromImagesRoute);
    app.use("/api/ajust-dpi", dpiRoute);
    app.use("/api/image-metadata", metadataRoute);
    app.use("/api/etsytools", etsytoolsRoute);

    app.listen(PORT, () => {
        console.log(`🚀 Servidor iniciado na porta ${PORT}`);
    });
};

const main = async () => {
    try {
        await initFolders();
        await createServer();
    } catch (err) {
        console.error("Falha ao iniciar o servidor:", err);
        process.exit(1);
    }
};

main();
