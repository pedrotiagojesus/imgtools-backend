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
 * Cache entry for disk space information
 */
interface CacheEntry {
    data: DiskSpaceInfo;
    timestamp: number;
}

/**
 * Cache for disk space checks to avoid excessive system calls
 * Key: path, Value: cached disk space info with timestamp
 */
const diskSpaceCache = new Map<string, CacheEntry>();

/**
 * Cache TTL in milliseconds (default: 30 seconds)
 * Disk space doesn't change frequently, so caching is safe
 */
const CACHE_TTL_MS = 30000;

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
 * Check if cached data is still valid
 * @param cacheEntry - Cache entry to check
 * @returns true if cache is still valid
 */
function isCacheValid(cacheEntry: CacheEntry): boolean {
    const now = Date.now();
    return (now - cacheEntry.timestamp) < CACHE_TTL_MS;
}

/**
 * Check disk space for a given path (platform-agnostic)
 * Results are cached for 30 seconds to avoid excessive system calls.
 *
 * @param path - Path to check
 * @param useCache - Whether to use cached results (default: true)
 * @returns Disk space information
 */
export async function checkDiskSpace(path: string, useCache: boolean = true): Promise<DiskSpaceInfo> {
    // Check cache first
    if (useCache) {
        const cached = diskSpaceCache.get(path);
        if (cached && isCacheValid(cached)) {
            logger.debug('Using cached disk space info', {
                path,
                age: Date.now() - cached.timestamp
            });
            return cached.data;
        }
    }

    // Perform actual check
    const isWindows = process.platform === 'win32';
    const diskInfo = isWindows
        ? await checkDiskSpaceWindows(path)
        : await checkDiskSpaceUnix(path);

    // Update cache
    diskSpaceCache.set(path, {
        data: diskInfo,
        timestamp: Date.now()
    });

    logger.debug('Disk space info cached', {
        path,
        usagePercent: diskInfo.usagePercent.toFixed(2)
    });

    return diskInfo;
}

/**
 * Clear the disk space cache
 * Useful for testing or when you need fresh data
 *
 * @param path - Optional path to clear. If not provided, clears entire cache
 */
export function clearDiskSpaceCache(path?: string): void {
    if (path) {
        diskSpaceCache.delete(path);
        logger.debug('Disk space cache cleared for path', { path });
    } else {
        diskSpaceCache.clear();
        logger.debug('Entire disk space cache cleared');
    }
}

/**
 * Get cache statistics
 * Useful for monitoring and debugging
 *
 * @returns Cache statistics
 */
export function getDiskSpaceCacheStats(): {
    size: number;
    entries: Array<{ path: string; age: number; valid: boolean }>;
} {
    const now = Date.now();
    const entries = Array.from(diskSpaceCache.entries()).map(([path, entry]) => ({
        path,
        age: now - entry.timestamp,
        valid: isCacheValid(entry)
    }));

    return {
        size: diskSpaceCache.size,
        entries
    };
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
