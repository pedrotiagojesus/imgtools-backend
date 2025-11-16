import { createHash } from 'crypto';
import { logger } from '../config/logger';

/**
 * Simple in-memory cache for image processing results
 * Uses LRU (Least Recently Used) eviction policy
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    hits: number;
}

class ImageCache {
    private cache: Map<string, CacheEntry<any>>;
    private maxSize: number;
    private ttl: number; // Time to live in milliseconds

    constructor(maxSize: number = 100, ttlSeconds: number = 3600) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttlSeconds * 1000;
    }

    /**
     * Generate cache key from operation and parameters
     */
    generateKey(operation: string, params: Record<string, any>): string {
        const hash = createHash('md5')
            .update(JSON.stringify({ operation, ...params }))
            .digest('hex');
        return `${operation}:${hash}`;
    }

    /**
     * Get value from cache
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            logger.debug('Cache entry expired', { key });
            return null;
        }

        // Update hits
        entry.hits++;
        entry.timestamp = Date.now(); // Refresh timestamp (LRU)

        logger.debug('Cache hit', { key, hits: entry.hits });
        return entry.data as T;
    }

    /**
     * Set value in cache
     */
    set<T>(key: string, data: T): void {
        // Evict oldest entry if cache is full
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictOldest();
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            hits: 0
        });

        logger.debug('Cache set', { key, cacheSize: this.cache.size });
    }

    /**
     * Evict the least recently used entry
     */
    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            logger.debug('Cache evicted', { key: oldestKey });
        }
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
        logger.info('Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
        entries: Array<{ key: string; hits: number; age: number }>;
    } {
        const now = Date.now();
        let totalHits = 0;
        const entries: Array<{ key: string; hits: number; age: number }> = [];

        for (const [key, entry] of this.cache.entries()) {
            totalHits += entry.hits;
            entries.push({
                key,
                hits: entry.hits,
                age: now - entry.timestamp
            });
        }

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: totalHits > 0 ? totalHits / this.cache.size : 0,
            entries: entries.sort((a, b) => b.hits - a.hits).slice(0, 10) // Top 10
        };
    }

    /**
     * Clean expired entries
     */
    cleanExpired(): number {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info('Cache cleanup completed', { cleaned, remaining: this.cache.size });
        }

        return cleaned;
    }
}

// Export singleton instance
export const imageCache = new ImageCache(100, 3600); // 100 entries, 1 hour TTL

// Periodic cleanup every 10 minutes
setInterval(() => {
    imageCache.cleanExpired();
}, 10 * 60 * 1000);
