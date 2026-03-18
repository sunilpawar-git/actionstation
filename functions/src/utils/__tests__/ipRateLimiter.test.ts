/**
 * IP Rate Limiter Tests
 * Validates per-IP sliding window behaviour using the in-memory implementation.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkIpRateLimit, clearIpRateLimitStore } from '../ipRateLimiter.js';

describe('ipRateLimiter', () => {
    beforeEach(async () => {
        vi.useFakeTimers();
        clearIpRateLimitStore();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('allows requests under the limit', async () => {
        const allowed = await checkIpRateLimit('1.2.3.4', 'geminiProxy', 5);
        expect(allowed).toBe(true);
    });

    it('blocks requests at the limit', async () => {
        for (let i = 0; i < 3; i++) {
            expect(await checkIpRateLimit('1.2.3.4', 'test', 3)).toBe(true);
        }
        expect(await checkIpRateLimit('1.2.3.4', 'test', 3)).toBe(false);
    });

    it('isolates different IPs', async () => {
        for (let i = 0; i < 3; i++) {
            await checkIpRateLimit('1.2.3.4', 'test', 3);
        }
        // different IP is unaffected
        expect(await checkIpRateLimit('5.6.7.8', 'test', 3)).toBe(true);
    });

    it('isolates different endpoints for the same IP', async () => {
        for (let i = 0; i < 3; i++) {
            await checkIpRateLimit('1.2.3.4', 'geminiProxy', 3);
        }
        expect(await checkIpRateLimit('1.2.3.4', 'geminiProxy', 3)).toBe(false);
        expect(await checkIpRateLimit('1.2.3.4', 'fetchLinkMeta', 3)).toBe(true);
    });

    it('resets after the time window expires', async () => {
        for (let i = 0; i < 3; i++) {
            await checkIpRateLimit('1.2.3.4', 'test', 3, 60_000);
        }
        expect(await checkIpRateLimit('1.2.3.4', 'test', 3, 60_000)).toBe(false);

        vi.advanceTimersByTime(61_000);

        expect(await checkIpRateLimit('1.2.3.4', 'test', 3, 60_000)).toBe(true);
    });

    it('handles IPv6 addresses', async () => {
        const ipv6 = '2001:db8::1';
        expect(await checkIpRateLimit(ipv6, 'test', 5)).toBe(true);
    });
});
