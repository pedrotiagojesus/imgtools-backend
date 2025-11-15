import { Server } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { generate as generateDirectories, remove as removeDirectories } from "./utils/directories";
import { tempFileManager } from "./utils/tempFileManager";

/**
 * Initialize required directories
 */
async function initFolders(): Promise<void> {
    try {
        await generateDirectories();
        await removeDirectories();
    } catch (error) {
        logger.error("Erro ao preparar pastas:", error);
        throw error;
    }
}

/**
 * Setup graceful shutdown handlers
 * Ensures proper cleanup of resources when the server is stopped
 */
function setupGracefulShutdown(server: Server): void {
    const shutdown = async (signal: string) => {
        logger.info(`${signal} received. Starting graceful shutdown...`);

        // Stop accepting new connections
        server.close(async () => {
            logger.info("HTTP server closed");

            try {
                // Stop periodic cleanup
                tempFileManager.stopPeriodicCleanup();

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
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
    try {
        // Environment validation happens automatically on import (fail fast)
        logger.info("Environment configuration validated successfully");
        logger.info(`Running in ${env.NODE_ENV} mode`);

        // Initialize directories
        await initFolders();

        // Create Express app
        const app = await createApp();

        // Start HTTP server
        const server = app.listen(env.PORT, () => {
            logger.info(`🚀 Servidor iniciado na porta ${env.PORT}`);
        });

        // Setup graceful shutdown
        setupGracefulShutdown(server);

        // Start periodic cleanup of temp files
        // Note: tempFileManager already starts its own periodic cleanup
        // This is an additional safety net
        setInterval(async () => {
            try {
                const stats = tempFileManager.getStatistics();
                if (stats.totalFiles > 100) {
                    logger.warn("High number of tracked temp files", {
                        count: stats.totalFiles,
                        oldestAge: stats.oldestFile?.age
                    });
                }
            } catch (error) {
                logger.error("Error during periodic monitoring:", error);
            }
        }, env.CLEANUP_INTERVAL_MS);

    } catch (err) {
        logger.error("Falha ao iniciar o servidor:", err);
        process.exit(1);
    }
}

// Start the server
startServer();
