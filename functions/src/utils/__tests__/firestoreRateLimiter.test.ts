/**
 * Firestore Rate Limiter Tests
 * Validates persistent rate limiting via mocked Firestore transactions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let storedData: Record<string, { timestamps: number[]; expiresAt: Date }> = {};

const mockSet = vi.fn((docRef: { path: string }, data: { timestamps: number[]; expiresAt: Date }) => {
    storedData[docRef.path] = data;
});

const mockGet = vi.fn(async (docRef: { path: string }) => ({
    data: () => storedData[docRef.path] ?? null,
}));

const mockDoc = vi.fn((key: string) => ({
    path: `_rateLimits/${key}`,
}));

const mockRunTransaction = vi.fn(async (fn: (tx: { get: typeof mockGet; set: typeof mockSet }) => Promise<boolean>) =>
    fn({ get: mockGet, set: mockSet }),
);

const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn();

vi.mock('firebase-admin/firestore', () => ({
    getFirestore: () => ({
        collection: () => ({
            doc: mockDoc,
            get: async () => ({
                docs: Object.keys(storedData).map((path) => ({
                    ref: { path },
                })),
            }),
        }),
        runTransaction: mockRunTransaction,
        batch: () => ({
            delete: mockBatchDelete,
            commit: mockBatchCommit,
        }),
    }),
}));

import { firestoreRateLimiter } from '../firestoreRateLimiter.js';

describe('firestoreRateLimiter', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        storedData = {};
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('allows requests under the limit', async () => {
        const allowed = await firestoreRateLimiter.checkRateLimit('user-1', 'test', 5, 60_000);
        expect(allowed).toBe(true);
        expect(mockSet).toHaveBeenCalledTimes(1);
    });

    it('blocks requests at the limit', async () => {
        for (let i = 0; i < 3; i++) {
            const result = await firestoreRateLimiter.checkRateLimit('user-1', 'test', 3, 60_000);
            expect(result).toBe(true);
        }
        const blocked = await firestoreRateLimiter.checkRateLimit('user-1', 'test', 3, 60_000);
        expect(blocked).toBe(false);
    });

    it('stores timestamps with TTL expiry date', async () => {
        vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
        await firestoreRateLimiter.checkRateLimit('user-1', 'test', 5, 60_000);

        const setCall = mockSet.mock.calls[0];
        const data = setCall[1] as { timestamps: number[]; expiresAt: Date };
        expect(data.timestamps.length).toBe(1);
        expect(data.expiresAt.getTime()).toBe(Date.now() + 60_000);
    });

    it('isolates different users', async () => {
        for (let i = 0; i < 3; i++) {
            await firestoreRateLimiter.checkRateLimit('user-1', 'test', 3, 60_000);
        }
        expect(await firestoreRateLimiter.checkRateLimit('user-1', 'test', 3, 60_000)).toBe(false);
        expect(await firestoreRateLimiter.checkRateLimit('user-2', 'test', 3, 60_000)).toBe(true);
    });

    it('resets after the time window expires', async () => {
        for (let i = 0; i < 3; i++) {
            await firestoreRateLimiter.checkRateLimit('user-1', 'test', 3, 60_000);
        }
        expect(await firestoreRateLimiter.checkRateLimit('user-1', 'test', 3, 60_000)).toBe(false);

        vi.advanceTimersByTime(61_000);

        expect(await firestoreRateLimiter.checkRateLimit('user-1', 'test', 3, 60_000)).toBe(true);
    });

    it('clearStore calls batch delete on all docs', async () => {
        storedData = { '_rateLimits/user-1:test': { timestamps: [1], expiresAt: new Date() } };
        await firestoreRateLimiter.clearStore();
        expect(mockBatchDelete).toHaveBeenCalled();
        expect(mockBatchCommit).toHaveBeenCalled();
    });
});
