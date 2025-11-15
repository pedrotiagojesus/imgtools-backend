import express, { Application } from "express";
import cors from "cors";

// Config
import { env } from "./config/env";

// Middleware
import { requestLogger } from "./middleware/requestLogger";
import { rateLimiter } from "./middleware/rateLimiter";
import { timeout } from "./middleware/timeout";
import { errorHandler } from "./middleware/errorHandler";

/**
 * Creates and configures the Express application
 * This function is separated from server initialization to allow for testing
 *
 * @returns Configured Express application
 */
export async function createApp(): Promise<Application> {
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
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            exposedHeaders: ['X-Filename', 'Content-Disposition'],
            credentials: true,
            maxAge: 86400 // 24 hours
        })
    );

    // 5. Body parser
    app.use(express.json());

    // 6. Routes
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

    // 7. Global error handler (must be last)
    app.use(errorHandler);

    return app;
}
