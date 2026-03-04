/**
 * Subscription Service Cache TTL Tests
 * TDD RED: Verifies cache expires after CACHE_TTL_MS
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { subscriptionService } from '../subscriptionService';

const mockGetDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));

vi.mock('@/config/firebase', () => ({
    db: {},
}));

const CACHE_TTL_MS = 5 * 60 * 1000;

describe('subscriptionService cache TTL', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        subscriptionService.clearCache();
        delete (import.meta.env as Record<string, unknown>).VITE_DEV_BYPASS_SUBSCRIPTION;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns cached value within TTL', async () => {
        mockGetDoc.mockResolvedValue({ exists: () => false });

        await subscriptionService.getSubscription('user-1');
        await subscriptionService.getSubscription('user-1');

        expect(mockGetDoc).toHaveBeenCalledTimes(1);
    });

    it('re-fetches after TTL expires', async () => {
        mockGetDoc.mockResolvedValue({ exists: () => false });

        await subscriptionService.getSubscription('user-1');
        expect(mockGetDoc).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(CACHE_TTL_MS + 1);

        await subscriptionService.getSubscription('user-1');
        expect(mockGetDoc).toHaveBeenCalledTimes(2);
    });

    it('clearCache forces re-fetch on next call', async () => {
        mockGetDoc.mockResolvedValue({ exists: () => false });

        await subscriptionService.getSubscription('user-1');
        expect(mockGetDoc).toHaveBeenCalledTimes(1);

        subscriptionService.clearCache();

        await subscriptionService.getSubscription('user-1');
        expect(mockGetDoc).toHaveBeenCalledTimes(2);
    });
});
