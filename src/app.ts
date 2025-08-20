import express from "express";
import cors from "cors";

// Routes
import convertRoute from "./routes/convert";
import resizeRoute from "./routes/resize";
import pdfFromImagesRoute from "./routes/pdf";
import dpiRoute from "./routes/dpi";
import metadataRoute from "./routes/metadata";

// Utils
import { generate as generateCoreFolder, remover as removerCoreFolder, UPLOADS_DIR } from "./utils/coreFolders";

const app = express();
const PORT = process.env.PORT || 4000;

import dotenv from "dotenv";
dotenv.config();

generateCoreFolder();
removerCoreFolder();

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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

