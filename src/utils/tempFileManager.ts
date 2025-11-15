import fs, { stat } from "fs/promises";
import { logger } from '../config/logger';
import { env } from '../config/env';

interface FileMetadata {
    path: string;
    createdAt: Date;
    requestId?: string;
}

class TempFileManager {
    private files: Map<string, FileMetadata> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.startPeriodicCleanup();
    }

    /**
     * Register a temporary file for tracking
     */
    add(filePath: string, requestId?: string): void {
        if (!this.files.has(filePath)) {
            this.files.set(filePath, {
                path: filePath,
                createdAt: new Date(),
                requestId
            });
            logger.debug('Temp file registered', { filePath, requestId });
        }
    }

    /**
     * Remove a specific file from disk and tracking
     */
    private async remove(filePath: string): Promise<void> {
        try {
            const stats = await stat(filePath);
            if (!stats.isDirectory()) {
                await fs.unlink(filePath);
                logger.debug('Temp file deleted', { filePath });
            } else {
                logger.warn('Path is a directory, skipping unlink', { filePath });
            }
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
                logger.warn('Error deleting temp file', { filePath, error: err });
            }
        }
    }

    /**
     * Clean up specific files or all tracked files
     */
    async cleanup(filePaths?: string[]): Promise<void> {
        if (filePaths && filePaths.length > 0) {
            // Clean up specific files
            logger.info('Cleaning up specific temp files', { count: filePaths.length });
            for (const filePath of filePaths) {
                await this.remove(filePath);
                this.files.delete(filePath);
            }
        } else {
            // Clean up all tracked files
            logger.info('Cleaning up all tracked temp files', { count: this.files.size });
            for (const [filePath] of this.files) {
                await this.remove(filePath);
            }
            this.files.clear();
        }
    }

    /**
     * Clean up all files associated with a specific request ID
     * Useful for cleaning up after a request completes or fails
     *
     * @param requestId - The request ID to clean up files for
     * @returns Number of files cleaned up
     */
    async cleanupByRequestId(requestId: string): Promise<number> {
        const filesToClean: string[] = [];

        // Find all files with matching requestId
        for (const [filePath, metadata] of this.files) {
            if (metadata.requestId === requestId) {
                filesToClean.push(filePath);
            }
        }

        if (filesToClean.length > 0) {
            logger.info('Cleaning up temp files by requestId', {
                requestId,
                count: filesToClean.length
            });

            for (const filePath of filesToClean) {
                await this.remove(filePath);
                this.files.delete(filePath);
            }

            logger.debug('Temp files cleaned by requestId', {
                requestId,
                count: filesToClean.length
            });
        }

        return filesToClean.length;
    }

    /**
     * Start periodic cleanup of old files
     */
    private startPeriodicCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldFiles().catch(err => {
                logger.error('Error in periodic cleanup', { error: err });
            });
        }, env.CLEANUP_INTERVAL_MS);

        logger.info('Periodic cleanup started', {
            intervalMs: env.CLEANUP_INTERVAL_MS,
            maxAgeMs: env.TEMP_FILE_MAX_AGE_MS
        });
    }

    /**
     * Clean up files older than configured age
     */
    private async cleanupOldFiles(): Promise<void> {
        const now = Date.now();
        const maxAge = env.TEMP_FILE_MAX_AGE_MS;
        const filesToClean: string[] = [];

        for (const [filePath, metadata] of this.files) {
            const age = now - metadata.createdAt.getTime();
            if (age > maxAge) {
                filesToClean.push(filePath);
            }
        }

        if (filesToClean.length > 0) {
            logger.info('Cleaning up old temp files', {
                count: filesToClean.length,
                maxAgeMs: maxAge
            });

            for (const filePath of filesToClean) {
                await this.remove(filePath);
                this.files.delete(filePath);
            }

            logger.info('Old temp files cleaned', { count: filesToClean.length });
        }
    }

    /**
     * Stop periodic cleanup (for graceful shutdown)
     */
    stopPeriodicCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            logger.info('Periodic cleanup stopped');
        }
    }

    /**
     * Get count of tracked files
     */
    getTrackedCount(): number {
        return this.files.size;
    }

    /**
     * Get count of tracked files for a specific request ID
     *
     * @param requestId - The request ID to count files for
     * @returns Number of files tracked for this request
     */
    getTrackedCountByRequestId(requestId: string): number {
        let count = 0;
        for (const metadata of this.files.values()) {
            if (metadata.requestId === requestId) {
                count++;
            }
        }
        return count;
    }

    /**
     * Get statistics about tracked files
     * Useful for monitoring and debugging
     *
     * @returns Statistics object with file counts and age information
     */
    getStatistics(): {
        totalFiles: number;
        byRequestId: Map<string, number>;
        oldestFile: { path: string; age: number } | null;
        averageAge: number;
    } {
        const byRequestId = new Map<string, number>();
        let oldestFile: { path: string; age: number } | null = null;
        let totalAge = 0;
        const now = Date.now();

        for (const [filePath, metadata] of this.files) {
            // Count by requestId
            if (metadata.requestId) {
                const count = byRequestId.get(metadata.requestId) || 0;
                byRequestId.set(metadata.requestId, count + 1);
            }

            // Track oldest file
            const age = now - metadata.createdAt.getTime();
            totalAge += age;

            if (!oldestFile || age > oldestFile.age) {
                oldestFile = { path: filePath, age };
            }
        }

        return {
            totalFiles: this.files.size,
            byRequestId,
            oldestFile,
            averageAge: this.files.size > 0 ? totalAge / this.files.size : 0
        };
    }
}

export const tempFileManager = new TempFileManager();
