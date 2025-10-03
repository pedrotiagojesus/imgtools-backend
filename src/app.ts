import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Utils
import { generate as generateCoreFolder, remover as removerCoreFolder } from "./utils/coreFolders";

const main = async () => {
    await generateCoreFolder();
    await removerCoreFolder();

    // Importa as rotas depois das pastas estarem criadas
    const convertRoute = (await import("./routes/convert")).default;
    const resizeRoute = (await import("./routes/resize")).default;
    const pdfFromImagesRoute = (await import("./routes/pdf")).default;
    const dpiRoute = (await import("./routes/dpi")).default;
    const metadataRoute = (await import("./routes/metadata")).default;
    const etsytoolsRoute = (await import("./routes/etsytools")).default;

    const app = express();
    const PORT = process.env.PORT || 4000;

    dotenv.config();

    app.use(
        cors({
            origin: process.env.CORS_ORIGIN || "*",
        })
    );
    app.use(express.json());
    app.use("/api/convert-image", convertRoute);
    app.use("/api/resize-image", resizeRoute);
    app.use("/api/pdf-from-images", pdfFromImagesRoute);
    app.use("/api/ajust-dpi", dpiRoute);
    app.use("/api/image-metadata", metadataRoute);
    app.use("/api/etsytools", etsytoolsRoute);

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

main();

