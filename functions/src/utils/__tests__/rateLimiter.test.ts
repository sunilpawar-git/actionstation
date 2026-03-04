/**
 * Rate Limiter Tests (via facade)
 * TDD: Validates per-user rate limiting, window expiration, and isolation
 * Tests run against the in-memory implementation (FUNCTIONS_EMULATOR default)
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, clearRateLimitStore, getRequestCount } from '../rateLimiter.js';

describe('rateLimiter', () => {
    beforeEach(async () => {
        vi.useFakeTimers();
        await clearRateLimitStore();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('allows requests under the limit', async () => {
        const allowed = await checkRateLimit('user-1', 'test', 5, 60_000);
        expect(allowed).toBe(true);
    });

    it('tracks request count correctly', async () => {
        await checkRateLimit('user-1', 'test', 10, 60_000);
        await checkRateLimit('user-1', 'test', 10, 60_000);
        await checkRateLimit('user-1', 'test', 10, 60_000);
        expect(getRequestCount('user-1', 'test')).toBe(3);
    });

    it('blocks requests at the limit', async () => {
        for (let i = 0; i < 3; i++) {
            expect(await checkRateLimit('user-1', 'test', 3, 60_000)).toBe(true);
        }
        expect(await checkRateLimit('user-1', 'test', 3, 60_000)).toBe(false);
    });

    it('isolates different users', async () => {
        for (let i = 0; i < 3; i++) {
            await checkRateLimit('user-1', 'test', 3, 60_000);
        }
        expect(await checkRateLimit('user-1', 'test', 3, 60_000)).toBe(false);
        expect(await checkRateLimit('user-2', 'test', 3, 60_000)).toBe(true);
    });

    it('isolates different endpoints for same user', async () => {
        for (let i = 0; i < 3; i++) {
            await checkRateLimit('user-1', 'meta', 3, 60_000);
        }
        expect(await checkRateLimit('user-1', 'meta', 3, 60_000)).toBe(false);
        expect(await checkRateLimit('user-1', 'image', 3, 60_000)).toBe(true);
    });

    it('resets after the time window expires', async () => {
        for (let i = 0; i < 3; i++) {
            await checkRateLimit('user-1', 'test', 3, 60_000);
        }
        expect(await checkRateLimit('user-1', 'test', 3, 60_000)).toBe(false);

        vi.advanceTimersByTime(61_000);

        expect(await checkRateLimit('user-1', 'test', 3, 60_000)).toBe(true);
    });
});
