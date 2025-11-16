import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { TEMP_DIR } from '../utils/directories';

const router = Router();

interface HealthCheckResult {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime: number;
    checks: {
        filesystem: {
            status: 'pass' | 'fail';
            tempDirWritable: boolean;
            message?: string;
        };
        memory: {
            status: 'pass' | 'fail';
            usagePercent: number;
            message?: string;
        };
    };
}

interface ReadinessCheckResult {
    status: 'ready' | 'not_ready';
    timestamp: string;
    checks: {
        filesystem: boolean;
        memory: boolean;
    };
}

/**
 * Check if a directory is writable
 */
async function checkDirectoryWritable(dir: string): Promise<boolean> {
    try {
        // Ensure directory exists
        await fs.promises.mkdir(dir, { recursive: true });

        // Try to write a test file
        const testFile = path.join(dir, `.health-check-${Date.now()}`);
        await fs.promises.writeFile(testFile, 'test');
        await fs.promises.unlink(testFile);

        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Check memory usage
 */
function checkMemoryUsage(): { usagePercent: number; isHealthy: boolean } {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const usagePercent = (usedMemory / totalMemory) * 100;

    return {
        usagePercent: Math.round(usagePercent * 100) / 100,
        isHealthy: usagePercent < 90
    };
}

/**
 * GET /health
 * Comprehensive health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
    try {
        // Check filesystem access
        const tempDirWritable = await checkDirectoryWritable(TEMP_DIR);
        const filesystemHealthy = tempDirWritable;

        // Check memory usage
        const memoryCheck = checkMemoryUsage();

        // Determine overall health
        const isHealthy = filesystemHealthy && memoryCheck.isHealthy;

        // Get version from package.json
        const packageJson = require('../../package.json');

        const result: HealthCheckResult = {
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            version: packageJson.version,
            uptime: Math.floor(process.uptime()),
            checks: {
                filesystem: {
                    status: filesystemHealthy ? 'pass' : 'fail',
                    tempDirWritable,
                    message: filesystemHealthy
                        ? 'Temporary directory is writable'
                        : 'Temporary directory is not writable'
                },
                memory: {
                    status: memoryCheck.isHealthy ? 'pass' : 'fail',
                    usagePercent: memoryCheck.usagePercent,
                    message: memoryCheck.isHealthy
                        ? 'Memory usage is within acceptable limits'
                        : 'Memory usage exceeds 90% threshold'
                }
            }
        };

        const statusCode = isHealthy ? 200 : 503;
        res.status(statusCode).json(result);
    } catch (error) {
        // If health check itself fails, return unhealthy
        const packageJson = require('../../package.json');

        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            version: packageJson.version,
            uptime: Math.floor(process.uptime()),
            error: 'Health check failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /health/ready
 * Readiness probe endpoint for container orchestration
 */
router.get('/health/ready', async (req: Request, res: Response) => {
    try {
        // Check filesystem access
        const tempDirWritable = await checkDirectoryWritable(TEMP_DIR);
        const filesystemReady = tempDirWritable;

        // Check memory usage
        const memoryCheck = checkMemoryUsage();

        // Determine readiness
        const isReady = filesystemReady && memoryCheck.isHealthy;

        const result: ReadinessCheckResult = {
            status: isReady ? 'ready' : 'not_ready',
            timestamp: new Date().toISOString(),
            checks: {
                filesystem: filesystemReady,
                memory: memoryCheck.isHealthy
            }
        };

        const statusCode = isReady ? 200 : 503;
        res.status(statusCode).json(result);
    } catch (error) {
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            error: 'Readiness check failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
