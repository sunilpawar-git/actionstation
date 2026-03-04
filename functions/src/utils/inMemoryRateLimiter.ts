/**
 * In-Memory Rate Limiter — sliding window per user, for tests and emulator
 * Implements the async RateLimiter interface with synchronous internals.
 */
import { RATE_LIMIT_WINDOW_MS } from './securityConstants.js';
import type { RateLimiter } from './rateLimiterTypes.js';

interface RateLimitEntry {
    timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

function check(
    userId: string,
    endpoint: string,
    maxRequests: number,
    windowMs: number,
): boolean {
    const key = `${userId}:${endpoint}`;
    const now = Date.now();
    const cutoff = now - windowMs;

    let entry = store.get(key);
    if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

    if (entry.timestamps.length >= maxRequests) {
        return false;
    }

    entry.timestamps.push(now);
    return true;
}

export const inMemoryRateLimiter: RateLimiter = {
    async checkRateLimit(userId, endpoint, maxRequests, windowMs = RATE_LIMIT_WINDOW_MS) {
        return check(userId, endpoint, maxRequests, windowMs);
    },
    async clearStore() {
        store.clear();
    },
};

/** Get current request count for a user/endpoint (for testing) */
export function getRequestCount(userId: string, endpoint: string): number {
    const key = `${userId}:${endpoint}`;
    const entry = store.get(key);
    if (!entry) return 0;
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    return entry.timestamps.filter((ts) => ts > cutoff).length;
}
