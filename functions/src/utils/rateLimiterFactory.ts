/**
 * Rate Limiter Factory — selects in-memory or Firestore (production)
 * K_SERVICE is set automatically by the Cloud Functions runtime.
 * Emulator and tests use in-memory for speed.
 */
import type { RateLimiter } from './rateLimiterTypes.js';
import { inMemoryRateLimiter } from './inMemoryRateLimiter.js';

function isDeployedFunction(): boolean {
    return !!process.env.K_SERVICE && process.env.FUNCTIONS_EMULATOR !== 'true';
}

let cachedLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
    if (cachedLimiter) return cachedLimiter;
    cachedLimiter = isDeployedFunction()
        ? createFirestoreLimiter()
        : inMemoryRateLimiter;
    return cachedLimiter;
}

function createFirestoreLimiter(): RateLimiter {
    return {
        async checkRateLimit(userId, endpoint, maxRequests, windowMs = 60_000) {
            const { firestoreRateLimiter } = await import('./firestoreRateLimiter.js');
            return firestoreRateLimiter.checkRateLimit(userId, endpoint, maxRequests, windowMs);
        },
        async clearStore() {
            const { firestoreRateLimiter } = await import('./firestoreRateLimiter.js');
            return firestoreRateLimiter.clearStore();
        },
    };
}
