/**
 * Rate Limiter — async facade over the factory-selected implementation
 * All handlers import from this file. The factory picks in-memory or Firestore.
 */
import { getRateLimiter } from './rateLimiterFactory.js';
import { inMemoryRateLimiter } from './inMemoryRateLimiter.js';

export { getRequestCount } from './inMemoryRateLimiter.js';

const limiter = getRateLimiter();

/**
 * Check if a request is within the rate limit and record it.
 * Returns a promise — callers must await.
 */
export function checkRateLimit(
    userId: string,
    endpoint: string,
    maxRequests: number,
    windowMs?: number,
): Promise<boolean> {
    return limiter.checkRateLimit(userId, endpoint, maxRequests, windowMs);
}

/** Clear all rate limit state (for testing — always clears in-memory store) */
export async function clearRateLimitStore(): Promise<void> {
    await inMemoryRateLimiter.clearStore();
}
