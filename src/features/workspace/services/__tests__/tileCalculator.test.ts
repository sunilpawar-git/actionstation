import { describe, it, expect } from 'vitest';
import {
    getTileId,
    getTileCoords,
    getTileIdFromCoords,
    getViewportTileIds,
    hasNodeChangedTile,
} from '../tileCalculator';
import { TILE_SIZE } from '@/config/firestoreQueryConfig';

describe('tileCalculator', () => {
    describe('getTileCoords', () => {
        it('returns (0,0) for origin', () => {
            expect(getTileCoords({ x: 0, y: 0 })).toEqual({ tileX: 0, tileY: 0 });
        });

        it('computes correct tile for positive coordinates', () => {
            expect(getTileCoords({ x: 7500, y: 9200 })).toEqual({ tileX: 3, tileY: 4 });
        });

        it('handles position exactly on tile boundary', () => {
            expect(getTileCoords({ x: TILE_SIZE, y: TILE_SIZE })).toEqual({ tileX: 1, tileY: 1 });
        });

        it('handles position one pixel before tile boundary', () => {
            expect(getTileCoords({ x: TILE_SIZE - 1, y: TILE_SIZE - 1 })).toEqual({ tileX: 0, tileY: 0 });
        });

        it('handles negative coordinates', () => {
            expect(getTileCoords({ x: -500, y: -3200 })).toEqual({ tileX: -1, tileY: -2 });
        });

        it('handles large coordinates', () => {
            expect(getTileCoords({ x: 100_000, y: 200_000 })).toEqual({ tileX: 50, tileY: 100 });
        });
    });

    describe('getTileId', () => {
        it('returns tile_0_0 for origin', () => {
            expect(getTileId({ x: 0, y: 0 })).toBe('tile_0_0');
        });

        it('returns correct tile ID for positive coordinates', () => {
            expect(getTileId({ x: 7500, y: 9200 })).toBe('tile_3_4');
        });

        it('returns correct tile ID for negative coordinates', () => {
            expect(getTileId({ x: -500, y: -3200 })).toBe('tile_n1_n2');
        });
    });

    describe('getTileIdFromCoords', () => {
        it('formats positive coordinates', () => {
            expect(getTileIdFromCoords(3, 4)).toBe('tile_3_4');
        });

        it('formats negative coordinates with n prefix', () => {
            expect(getTileIdFromCoords(-1, -2)).toBe('tile_n1_n2');
        });

        it('formats zero coordinates', () => {
            expect(getTileIdFromCoords(0, 0)).toBe('tile_0_0');
        });

        it('formats mixed sign coordinates', () => {
            expect(getTileIdFromCoords(-3, 5)).toBe('tile_n3_5');
        });
    });

    describe('getViewportTileIds', () => {
        it('returns single tile for a small viewport inside one tile', () => {
            const tileIds = getViewportTileIds(
                { x: -100, y: -100, zoom: 1 },
                1,
                500,
                500,
            );
            expect(tileIds).toContain('tile_0_0');
        });

        it('returns multiple tiles when viewport spans tile boundaries', () => {
            const tileIds = getViewportTileIds(
                { x: 0, y: 0, zoom: 1 },
                1,
                5000,
                5000,
            );
            expect(tileIds.length).toBeGreaterThan(1);
            expect(tileIds).toContain('tile_0_0');
            expect(tileIds).toContain('tile_1_1');
            expect(tileIds).toContain('tile_2_2');
        });

        it('accounts for zoom level (zoomed out sees more tiles)', () => {
            const zoomedIn = getViewportTileIds(
                { x: -100, y: -100, zoom: 2 },
                2,
                800,
                600,
            );
            const zoomedOut = getViewportTileIds(
                { x: -100, y: -100, zoom: 0.5 },
                0.5,
                800,
                600,
            );
            expect(zoomedOut.length).toBeGreaterThanOrEqual(zoomedIn.length);
        });

        it('handles viewport at negative canvas positions', () => {
            const tileIds = getViewportTileIds(
                { x: 5000, y: 5000, zoom: 1 },
                1,
                1000,
                1000,
            );
            expect(tileIds.length).toBeGreaterThan(0);
            tileIds.forEach((id) => {
                expect(id).toMatch(/^tile_n?\d+_n?\d+$/);
            });
        });

        it('returns no duplicates', () => {
            const tileIds = getViewportTileIds(
                { x: -2000, y: -2000, zoom: 1 },
                1,
                6000,
                6000,
            );
            const unique = new Set(tileIds);
            expect(unique.size).toBe(tileIds.length);
        });
    });

    describe('hasNodeChangedTile', () => {
        it('returns false when both positions are in same tile', () => {
            expect(hasNodeChangedTile({ x: 100, y: 100 }, { x: 500, y: 500 })).toBe(false);
        });

        it('returns true when positions are in different tiles', () => {
            expect(hasNodeChangedTile({ x: 100, y: 100 }, { x: 2500, y: 100 })).toBe(true);
        });

        it('returns false for identical positions', () => {
            expect(hasNodeChangedTile({ x: 7500, y: 9200 }, { x: 7500, y: 9200 })).toBe(false);
        });

        it('returns true when crossing tile boundary by 1px', () => {
            expect(hasNodeChangedTile({ x: TILE_SIZE - 1, y: 0 }, { x: TILE_SIZE, y: 0 })).toBe(true);
        });

        it('handles negative to positive tile transition', () => {
            expect(hasNodeChangedTile({ x: -1, y: 0 }, { x: 0, y: 0 })).toBe(true);
        });
    });
});
