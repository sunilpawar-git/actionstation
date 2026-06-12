/**
 * tileLoader retry behaviour — TDD tests (written BEFORE implementation).
 * Verifies that fetchTile is retried on transient Firestore errors and
 * that non-retryable errors are surfaced immediately.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tileLoader } from '../tileLoader';

const mockGetDocs = vi.fn();

vi.mock('@/config/firebase', () => ({ db: {} }));
vi.mock('@/shared/services/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn((...args: string[]) => ({ _path: args.join('/') })),
    query: vi.fn((ref: unknown) => ref),
    limit: vi.fn(),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock('@/migrations/migrationRunner', () => ({
    migrateNode: vi.fn((node: unknown) => node),
    CURRENT_SCHEMA_VERSION: 3,
}));

function makeTransientError(code: string): Error & { code: string } {
    const err = new Error(`Firestore error: ${code}`) as Error & { code: string };
    err.code = code;
    return err;
}

describe('tileLoader — retry on transient errors', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        tileLoader.clearCache();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('retries on "unavailable" error and resolves on second attempt', async () => {
        mockGetDocs
            .mockRejectedValueOnce(makeTransientError('unavailable'))
            .mockResolvedValueOnce({ docs: [], size: 0 });

        const promise = tileLoader.loadTiles('u1', 'ws1', ['tile_0_0']);
        // Advance past first retry delay (baseDelay=1000 * 2^0 = 1000ms)
        await vi.advanceTimersByTimeAsync(1500);
        const nodes = await promise;

        expect(mockGetDocs).toHaveBeenCalledTimes(2);
        expect(nodes).toEqual([]);
    });

    it('retries on "deadline-exceeded" and eventually succeeds', async () => {
        mockGetDocs
            .mockRejectedValueOnce(makeTransientError('deadline-exceeded'))
            .mockResolvedValueOnce({ docs: [], size: 0 });

        const promise = tileLoader.loadTiles('u1', 'ws1', ['tile_0_0']);
        await vi.advanceTimersByTimeAsync(1500);
        await promise;

        expect(mockGetDocs).toHaveBeenCalledTimes(2);
    });

    it('throws immediately on "permission-denied" (non-retryable)', async () => {
        const err = makeTransientError('permission-denied');
        mockGetDocs.mockRejectedValueOnce(err);

        const promise = tileLoader.loadTiles('u1', 'ws1', ['tile_0_0']);
        // Attach rejection handler BEFORE advancing timers
        const rejection = expect(promise).rejects.toThrow();
        await vi.advanceTimersByTimeAsync(100);
        await rejection;

        expect(mockGetDocs).toHaveBeenCalledTimes(1);
    });

    it('throws immediately on "unauthenticated" (non-retryable)', async () => {
        const err = makeTransientError('unauthenticated');
        mockGetDocs.mockRejectedValueOnce(err);

        const promise = tileLoader.loadTiles('u1', 'ws1', ['tile_0_0']);
        const rejection = expect(promise).rejects.toThrow();
        await vi.advanceTimersByTimeAsync(100);
        await rejection;

        expect(mockGetDocs).toHaveBeenCalledTimes(1);
    });

    it('exhausts retries and throws after 3 transient failures', async () => {
        mockGetDocs.mockRejectedValue(makeTransientError('unavailable'));

        const promise = tileLoader.loadTiles('u1', 'ws1', ['tile_0_0']);
        const rejection = expect(promise).rejects.toThrow();
        // 3 retries: delays 1000, 2000, 4000 ms
        await vi.advanceTimersByTimeAsync(10_000);
        await rejection;

        expect(mockGetDocs).toHaveBeenCalledTimes(4); // initial + 3 retries
    });
});
