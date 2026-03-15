import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/firebase', () => ({ db: {} }));
vi.mock('@/shared/services/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockGetDocs = vi.fn();

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

import { tileLoader } from '../tileLoader';
import type { CanvasNode } from '@/features/canvas/types/node';

function makeNodeDoc(overrides: Partial<CanvasNode> & { id: string }) {
    return {
        id: overrides.id,
        data: () => ({
            id: overrides.id,
            type: overrides.type ?? 'idea',
            data: overrides.data ?? { heading: 'test' },
            position: overrides.position ?? { x: 100, y: 100 },
            width: overrides.width ?? 280,
            height: overrides.height ?? 220,
            createdAt: { toDate: () => new Date('2024-01-01') },
            updatedAt: { toDate: () => new Date('2024-01-01') },
        }),
    };
}

describe('tileLoader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        tileLoader.clearCache();
    });

    describe('loadTiles', () => {
        it('loads nodes from a single tile', async () => {
            const doc1 = makeNodeDoc({ id: 'n1', position: { x: 100, y: 200 } });
            mockGetDocs.mockResolvedValueOnce({ docs: [doc1], size: 1 });

            const nodes = await tileLoader.loadTiles('u1', 'ws1', ['tile_0_0']);
            expect(nodes).toHaveLength(1);
            expect(nodes[0]!.id).toBe('n1');
        });

        it('loads nodes from multiple tiles in parallel', async () => {
            const doc1 = makeNodeDoc({ id: 'n1' });
            const doc2 = makeNodeDoc({ id: 'n2' });

            mockGetDocs.mockResolvedValueOnce({ docs: [doc1], size: 1 });
            mockGetDocs.mockResolvedValueOnce({ docs: [doc2], size: 1 });

            const nodes = await tileLoader.loadTiles('u1', 'ws1', ['tile_0_0', 'tile_1_0']);
            expect(nodes).toHaveLength(2);
            expect(mockGetDocs).toHaveBeenCalledTimes(2);
        });

        it('returns empty array for empty tile', async () => {
            mockGetDocs.mockResolvedValueOnce({ docs: [], size: 0 });

            const nodes = await tileLoader.loadTiles('u1', 'ws1', ['tile_5_5']);
            expect(nodes).toHaveLength(0);
        });

        it('caches tile data — second call skips Firestore', async () => {
            const doc1 = makeNodeDoc({ id: 'n1' });
            mockGetDocs.mockResolvedValueOnce({ docs: [doc1], size: 1 });

            await tileLoader.loadTiles('u1', 'ws1', ['tile_0_0']);
            const nodes = await tileLoader.loadTiles('u1', 'ws1', ['tile_0_0']);

            expect(mockGetDocs).toHaveBeenCalledTimes(1);
            expect(nodes).toHaveLength(1);
        });

        it('fetches only uncached tiles when mixing cached and new', async () => {
            const doc1 = makeNodeDoc({ id: 'n1' });
            const doc2 = makeNodeDoc({ id: 'n2' });
            mockGetDocs.mockResolvedValueOnce({ docs: [doc1], size: 1 });

            await tileLoader.loadTiles('u1', 'ws1', ['tile_0_0']);
            mockGetDocs.mockResolvedValueOnce({ docs: [doc2], size: 1 });

            const nodes = await tileLoader.loadTiles('u1', 'ws1', ['tile_0_0', 'tile_1_0']);
            expect(mockGetDocs).toHaveBeenCalledTimes(2);
            expect(nodes).toHaveLength(2);
        });

        it('returns nodes with correct structure', async () => {
            const doc1 = makeNodeDoc({
                id: 'n1', position: { x: 500, y: 600 },
                data: { heading: 'hello' },
            });
            mockGetDocs.mockResolvedValueOnce({ docs: [doc1], size: 1 });

            const nodes = await tileLoader.loadTiles('u1', 'ws1', ['tile_0_0']);
            expect(nodes[0]).toMatchObject({
                id: 'n1',
                workspaceId: 'ws1',
                position: { x: 500, y: 600 },
            });
        });
    });

    describe('invalidateTile', () => {
        it('forces re-fetch on next loadTiles call', async () => {
            const doc1 = makeNodeDoc({ id: 'n1' });
            mockGetDocs.mockResolvedValue({ docs: [doc1], size: 1 });

            await tileLoader.loadTiles('u1', 'ws1', ['tile_0_0']);
            tileLoader.invalidateTile('tile_0_0');
            await tileLoader.loadTiles('u1', 'ws1', ['tile_0_0']);

            expect(mockGetDocs).toHaveBeenCalledTimes(2);
        });
    });

    describe('evictStaleTiles', () => {
        it('removes stale tiles not in active set after TILE_EVICTION_MS', async () => {
            vi.useFakeTimers();
            const doc1 = makeNodeDoc({ id: 'n1' });
            mockGetDocs.mockResolvedValue({ docs: [doc1], size: 1 });

            await tileLoader.loadTiles('u1', 'ws1', ['tile_0_0', 'tile_1_0']);
            vi.advanceTimersByTime(61_000);
            const evicted = tileLoader.evictStaleTiles(['tile_0_0']);

            expect(tileLoader.getCachedTileIds()).toContain('tile_0_0');
            expect(tileLoader.getCachedTileIds()).not.toContain('tile_1_0');
            expect(evicted).toEqual(['tile_1_0']);
            vi.useRealTimers();
        });

        it('keeps recent inactive tiles when under TILE_EVICTION_MS', async () => {
            const doc1 = makeNodeDoc({ id: 'n1' });
            mockGetDocs.mockResolvedValue({ docs: [doc1], size: 1 });

            await tileLoader.loadTiles('u1', 'ws1', ['tile_0_0', 'tile_1_0']);
            const evicted = tileLoader.evictStaleTiles(['tile_0_0']);

            expect(tileLoader.getCachedTileIds()).toContain('tile_0_0');
            expect(tileLoader.getCachedTileIds()).toContain('tile_1_0');
            expect(evicted).toEqual([]);
        });
    });

    describe('clearCache', () => {
        it('empties all cached tiles', async () => {
            const doc1 = makeNodeDoc({ id: 'n1' });
            mockGetDocs.mockResolvedValue({ docs: [doc1], size: 1 });

            await tileLoader.loadTiles('u1', 'ws1', ['tile_0_0']);
            tileLoader.clearCache();

            expect(tileLoader.getCachedTileIds()).toHaveLength(0);
        });
    });

    describe('getCachedTileIds', () => {
        it('returns list of currently cached tile IDs', async () => {
            const doc1 = makeNodeDoc({ id: 'n1' });
            mockGetDocs.mockResolvedValue({ docs: [doc1], size: 1 });

            await tileLoader.loadTiles('u1', 'ws1', ['tile_0_0', 'tile_1_1']);
            const cached = tileLoader.getCachedTileIds();
            expect(cached).toContain('tile_0_0');
            expect(cached).toContain('tile_1_1');
        });
    });
});
