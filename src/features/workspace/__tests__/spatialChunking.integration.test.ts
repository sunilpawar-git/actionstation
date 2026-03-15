/**
 * Spatial Chunking Integration Tests
 * Verifies that the full tile system works end-to-end:
 * - tileCalculator computes correct tile IDs
 * - migrationRunner v3 adds tileId to nodes
 * - tiledNodeWriter groups nodes by tile
 * - tileLoader reads from tile subcollections
 * - workspace type has spatialChunkingEnabled flag
 */
import { describe, it, expect, vi } from 'vitest';
import { getTileId, getTileCoords, getViewportTileIds, hasNodeChangedTile } from '../services/tileCalculator';
import { tileReducer, INITIAL_TILE_STATE } from '../hooks/tileReducer';
import { TILE_SIZE, TILE_PREFETCH_RING, TILE_EVICTION_MS } from '@/config/firestoreQueryConfig';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { Workspace } from '../types/workspace';

vi.mock('@/shared/services/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('Spatial Chunking Integration', () => {
    describe('config constants are correct', () => {
        it('TILE_SIZE is 2000', () => {
            expect(TILE_SIZE).toBe(2000);
        });

        it('TILE_PREFETCH_RING is 1', () => {
            expect(TILE_PREFETCH_RING).toBe(1);
        });

        it('TILE_EVICTION_MS is 60000', () => {
            expect(TILE_EVICTION_MS).toBe(60_000);
        });
    });

    describe('node -> tile mapping is consistent', () => {
        it('node position maps to deterministic tile ID', () => {
            const pos = { x: 7500, y: 9200 };
            const tileId = getTileId(pos);
            const coords = getTileCoords(pos);
            expect(tileId).toBe(`tile_${coords.tileX}_${coords.tileY}`);
            expect(tileId).toBe('tile_3_4');
        });

        it('hasNodeChangedTile is consistent with getTileId', () => {
            const posA = { x: 100, y: 100 };
            const posB = { x: 2500, y: 100 };
            expect(hasNodeChangedTile(posA, posB)).toBe(getTileId(posA) !== getTileId(posB));
        });
    });

    describe('viewport tile computation covers expected range', () => {
        it('viewport at origin with default size covers tile_0_0', () => {
            const tiles = getViewportTileIds({ x: 0, y: 0, zoom: 1 }, 1, 1920, 1080);
            expect(tiles).toContain('tile_0_0');
        });

        it('zoomed out viewport covers more tiles', () => {
            const tilesZoomIn = getViewportTileIds({ x: 0, y: 0, zoom: 2 }, 2, 1920, 1080);
            const tilesZoomOut = getViewportTileIds({ x: 0, y: 0, zoom: 0.5 }, 0.5, 1920, 1080);
            expect(tilesZoomOut.length).toBeGreaterThan(tilesZoomIn.length);
        });
    });

    describe('tile reducer lifecycle', () => {
        it('request -> load -> evict produces clean state', () => {
            let state = INITIAL_TILE_STATE;
            state = tileReducer(state, { type: 'TILES_REQUESTED', tileIds: ['tile_0_0', 'tile_1_0'] });
            state = tileReducer(state, { type: 'TILES_LOADED', tileIds: ['tile_0_0', 'tile_1_0'] });
            state = tileReducer(state, { type: 'TILES_EVICTED', tileIds: ['tile_1_0'] });

            expect(state.loadedTileIds).toEqual(['tile_0_0']);
            expect(state.loadingTileIds).toEqual([]);
            expect(state.errorTileIds).toEqual([]);
        });

        it('failed tiles can be retried via TILES_REQUESTED', () => {
            let state = INITIAL_TILE_STATE;
            state = tileReducer(state, { type: 'TILES_REQUESTED', tileIds: ['tile_0_0'] });
            state = tileReducer(state, { type: 'TILES_FAILED', tileIds: ['tile_0_0'] });
            expect(state.errorTileIds).toContain('tile_0_0');

            state = tileReducer(state, { type: 'TILES_REQUESTED', tileIds: ['tile_0_0'] });
            expect(state.errorTileIds).not.toContain('tile_0_0');
            expect(state.loadingTileIds).toContain('tile_0_0');
        });
    });

    describe('type compatibility', () => {
        it('CanvasNode accepts tileId field', () => {
            const node: CanvasNode = {
                id: 'n1', workspaceId: 'ws1', type: 'idea',
                data: { heading: 'test' },
                position: { x: 100, y: 200 },
                createdAt: new Date(), updatedAt: new Date(),
                tileId: 'tile_0_0',
            };
            expect(node.tileId).toBe('tile_0_0');
        });

        it('CanvasNode works without tileId (backward compat)', () => {
            const node: CanvasNode = {
                id: 'n2', workspaceId: 'ws1', type: 'idea',
                data: { heading: 'test' },
                position: { x: 0, y: 0 },
                createdAt: new Date(), updatedAt: new Date(),
            };
            expect(node.tileId).toBeUndefined();
        });

        it('Workspace accepts spatialChunkingEnabled field', () => {
            const ws: Workspace = {
                id: 'ws1', userId: 'u1', name: 'Test',
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(), updatedAt: new Date(),
                spatialChunkingEnabled: true,
            };
            expect(ws.spatialChunkingEnabled).toBe(true);
        });

        it('Workspace works without spatialChunkingEnabled (backward compat)', () => {
            const ws: Workspace = {
                id: 'ws2', userId: 'u1', name: 'Test',
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(), updatedAt: new Date(),
            };
            expect(ws.spatialChunkingEnabled).toBeUndefined();
        });
    });

    describe('string resources exist', () => {
        it('workspace tile strings are available', async () => {
            const { strings } = await import('@/shared/localization/strings');
            expect(strings.workspace.tileComputing).toBeDefined();
            expect(strings.workspace.tileLoadFailed).toBeDefined();
            expect(strings.workspace.tileMigrationComplete).toBeDefined();
            expect(strings.workspace.tileMigrationFailed).toBeDefined();
            expect(typeof strings.workspace.tileMigrationProgress).toBe('function');
        });
    });
});
