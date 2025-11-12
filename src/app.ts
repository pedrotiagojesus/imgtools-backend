import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

// Config - Validate environment first (fail fast)
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { logger } from "./config/logger";

// Middleware
import { requestLogger } from "./middleware/requestLogger";
import { rateLimiter } from "./middleware/rateLimiter";
import { timeout } from "./middleware/timeout";
import { errorHandler } from "./middleware/errorHandler";

// Utils
import { generate as generateCoreFolder, remove as removeCoreFolder } from "./utils/coreFolders";
import { tempFileManager } from "./utils/tempFileManager";

const initFolders = async () => {
    try {
        await generateCoreFolder();
        await removeCoreFolder();
    } catch (error) {
        logger.error("Erro ao preparar pastas:", error);
        throw error;
    }
};

const createServer = async () => {
    const app = express();

    // Middleware order: logger → rate limiter → timeout → cors → body parser → routes → error handler

    // 1. Request logging and tracking
    app.use(requestLogger);

    // 2. Rate limiting
    app.use(rateLimiter);

    // 3. Request timeout
    app.use(timeout);

    // 4. CORS
    app.use(
        cors({
            origin: env.CORS_ORIGIN,
            exposedHeaders: ["X-Filename", "Content-Disposition"],
        })
    );

    // 5. Body parser
    app.use(express.json());

    // 6. API Documentation
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // 7. Routes
    const healthRoute = (await import("./routes/health")).default;
    const convertRoute = (await import("./routes/convert")).default;
    const resizeRoute = (await import("./routes/resize")).default;
    const pdfFromImagesRoute = (await import("./routes/pdf")).default;
    const dpiRoute = (await import("./routes/dpi")).default;
    const metadataRoute = (await import("./routes/metadata")).default;
    const etsytoolsRoute = (await import("./routes/etsytools")).default;

    app.use("/health", healthRoute);
    app.use("/api/convert-image", convertRoute);
    app.use("/api/resize-image", resizeRoute);
    app.use("/api/pdf-from-images", pdfFromImagesRoute);
    app.use("/api/ajust-dpi", dpiRoute);
    app.use("/api/image-metadata", metadataRoute);
    app.use("/api/etsytools", etsytoolsRoute);

    // 8. Global error handler (must be last)
    app.use(errorHandler);

    const server = app.listen(env.PORT, () => {
        logger.info(`🚀 Servidor iniciado na porta ${env.PORT}`);
        logger.info(`📚 API Documentation available at http://localhost:${env.PORT}/api-docs`);
    });

    return server;
};

// Graceful shutdown handler
const setupGracefulShutdown = (server: any) => {
    const shutdown = async (signal: string) => {
        logger.info(`${signal} received. Starting graceful shutdown...`);

        // Stop accepting new connections
        server.close(async () => {
            logger.info("HTTP server closed");

            try {
                // Cleanup temp files
                await tempFileManager.cleanup();
                logger.info("Temp files cleaned up");

                logger.info("Graceful shutdown completed");
                process.exit(0);
            } catch (error) {
                logger.error("Error during graceful shutdown:", error);
                process.exit(1);
            }
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
            logger.error("Forced shutdown after timeout");
            process.exit(1);
        }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
};

const main = async () => {
    try {
        // Environment validation happens automatically on import (fail fast)
        logger.info("Environment configuration validated successfully");
        logger.info(`Running in ${env.NODE_ENV} mode`);

        await initFolders();
        const server = await createServer();
        setupGracefulShutdown(server);

        // Start periodic cleanup of temp files
        setInterval(async () => {
            try {
                await tempFileManager.cleanup();
            } catch (error) {
                logger.error("Error during periodic cleanup:", error);
            }
        }, env.CLEANUP_INTERVAL_MS);
    } catch (err) {
        logger.error("Falha ao iniciar o servidor:", err);
        process.exit(1);
    }
};

main();
