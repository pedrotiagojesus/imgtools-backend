import { exec } from 'child_process';
import { promisify } from 'util';
import { InsufficientStorageError } from '../errors';
import { logger } from '../config/logger';
import { Request, Response, NextFunction } from 'express';

const execAsync = promisify(exec);

/**
 * Disk space information
 */
interface DiskSpaceInfo {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
}

/**
 * Check disk space on Windows using wmic command
 * @param path - Path to check (defaults to C: drive)
 * @returns Disk space information
 */
async function checkDiskSpaceWindows(path: string = 'C:'): Promise<DiskSpaceInfo> {
    try {
        // Extract drive letter from path
        const drive = path.match(/^([A-Za-z]:)/)?.[1] || 'C:';

        // Use wmic to get disk space info
        const { stdout } = await execAsync(
            `wmic logicaldisk where "DeviceID='${drive}'" get Size,FreeSpace /format:csv`
        );

        // Parse CSV output (skip header and empty lines)
        const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));

        if (lines.length === 0) {
            throw new Error('Unable to parse disk space information');
        }

        // CSV format: Node,FreeSpace,Size
        const parts = lines[0].split(',');
        const free = parseInt(parts[1], 10);
        const total = parseInt(parts[2], 10);

        if (isNaN(free) || isNaN(total)) {
            throw new Error('Invalid disk space values');
        }

        const used = total - free;
        const usagePercent = (used / total) * 100;

        return {
            total,
            used,
            free,
            usagePercent
        };
    } catch (error) {
        logger.error('Failed to check disk space on Windows', { error, path });
        throw new Error('Failed to check disk space');
    }
}

/**
 * Check disk space on Unix/Linux using df command
 * @param path - Path to check
 * @returns Disk space information
 */
async function checkDiskSpaceUnix(path: string): Promise<DiskSpaceInfo> {
    try {
        // Use df command with -k flag for 1K blocks
        const { stdout } = await execAsync(`df -k "${path}"`);

        // Parse output (skip header line)
        const lines = stdout.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            throw new Error('Unable to parse disk space information');
        }

        // Parse the data line (format: Filesystem 1K-blocks Used Available Use% Mounted)
        const parts = lines[1].split(/\s+/);

        // Handle cases where filesystem name wraps to next line
        const dataStart = parts[0].startsWith('/') ? 1 : 0;

        const total = parseInt(parts[dataStart], 10) * 1024; // Convert KB to bytes
        const used = parseInt(parts[dataStart + 1], 10) * 1024;
        const free = parseInt(parts[dataStart + 2], 10) * 1024;
        const usagePercent = parseFloat(parts[dataStart + 3]);

        if (isNaN(total) || isNaN(used) || isNaN(free)) {
            throw new Error('Invalid disk space values');
        }

        return {
            total,
            used,
            free,
            usagePercent
        };
    } catch (error) {
        logger.error('Failed to check disk space on Unix', { error, path });
        throw new Error('Failed to check disk space');
    }
}

/**
 * Check disk space for a given path (platform-agnostic)
 * @param path - Path to check
 * @returns Disk space information
 */
export async function checkDiskSpace(path: string): Promise<DiskSpaceInfo> {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
        return checkDiskSpaceWindows(path);
    } else {
        return checkDiskSpaceUnix(path);
    }
}

/**
 * Middleware to check disk space before file operations
 * Throws InsufficientStorageError if disk usage exceeds 90%
 * @param threshold - Usage percentage threshold (default: 90)
 */
export function checkDiskSpaceMiddleware(threshold: number = 90) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Check disk space for the upload directory
            const uploadPath = process.cwd() + '/tmp/upload';
            const diskInfo = await checkDiskSpace(uploadPath);

            logger.debug('Disk space check', {
                path: uploadPath,
                usagePercent: diskInfo.usagePercent.toFixed(2),
                free: (diskInfo.free / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
                threshold: threshold + '%'
            });

            if (diskInfo.usagePercent > threshold) {
                throw new InsufficientStorageError(
                    `Disk usage at ${diskInfo.usagePercent.toFixed(1)}% exceeds threshold of ${threshold}%`
                );
            }

            next();
        } catch (error) {
            // If it's already an InsufficientStorageError, pass it through
            if (error instanceof InsufficientStorageError) {
                next(error);
                return;
            }

            // For other errors, log and pass through without blocking
            // (we don't want disk check failures to prevent uploads)
            logger.warn('Disk space check failed, allowing request to proceed', { error });
            next();
        }
    };
}
