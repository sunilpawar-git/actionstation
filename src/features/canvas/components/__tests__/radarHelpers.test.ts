import { describe, it, expect } from 'vitest';
import {
    computeBoundingBox,
    createRadarTransform,
    normalizePositions,
    mapViewportToRadar,
} from '../radarHelpers';
import type { NodePosition } from '../../types/node';

describe('computeBoundingBox', () => {
    it('returns null for empty array', () => {
        expect(computeBoundingBox([])).toBeNull();
    });

    it('returns exact position for a single node', () => {
        const positions: NodePosition[] = [{ x: 100, y: 200 }];
        expect(computeBoundingBox(positions)).toEqual({
            minX: 100, minY: 200, maxX: 100, maxY: 200,
        });
    });

    it('computes correct bounding box for multiple nodes', () => {
        const positions: NodePosition[] = [
            { x: 10, y: 20 },
            { x: 300, y: 50 },
            { x: 150, y: 400 },
        ];
        expect(computeBoundingBox(positions)).toEqual({
            minX: 10, minY: 20, maxX: 300, maxY: 400,
        });
    });

    it('handles negative coordinates', () => {
        const positions: NodePosition[] = [
            { x: -100, y: -200 },
            { x: 50, y: 30 },
        ];
        expect(computeBoundingBox(positions)).toEqual({
            minX: -100, minY: -200, maxX: 50, maxY: 30,
        });
    });
});

describe('createRadarTransform', () => {
    const SIZE = 32;

    it('returns null for zero-area bounding box', () => {
        const bbox = { minX: 5, minY: 5, maxX: 5, maxY: 5 };
        expect(createRadarTransform(bbox, SIZE)).toBeNull();
    });

    it('returns a transform with correct scale for a square bbox', () => {
        const bbox = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
        const t = createRadarTransform(bbox, SIZE)!;
        expect(t).not.toBeNull();
        // usable = 32 - 2 * (32 * 0.15) = 32 - 9.6 = 22.4
        // scale = 22.4 / 100 = 0.224
        expect(t.scale).toBeCloseTo(0.224, 3);
        expect(t.minX).toBe(0);
        expect(t.minY).toBe(0);
    });

    it('returns centred offsets for a wide bbox', () => {
        const bbox = { minX: 0, minY: 0, maxX: 200, maxY: 100 };
        const t = createRadarTransform(bbox, SIZE)!;
        // scale = 22.4 / 200 = 0.112
        expect(t.scale).toBeCloseTo(0.112, 3);
        // scaledH = 100 * 0.112 = 11.2 → offsetY centres it
        expect(t.offsetY).toBeGreaterThan(t.offsetX);
    });
});

describe('normalizePositions', () => {
    const SIZE = 32;

    it('centers a single node (null transform)', () => {
        const positions: NodePosition[] = [{ x: 500, y: 500 }];
        const dots = normalizePositions(positions, null, SIZE);

        expect(dots).toHaveLength(1);
        expect(dots[0]!.x).toBe(SIZE / 2);
        expect(dots[0]!.y).toBe(SIZE / 2);
    });

    it('centers all nodes when stacked (null transform)', () => {
        const positions: NodePosition[] = [
            { x: 100, y: 200 },
            { x: 100, y: 200 },
        ];
        const dots = normalizePositions(positions, null, SIZE);

        expect(dots).toHaveLength(2);
        dots.forEach((dot) => {
            expect(dot.x).toBe(SIZE / 2);
            expect(dot.y).toBe(SIZE / 2);
        });
    });

    it('maps two nodes along horizontal axis with transform', () => {
        const positions: NodePosition[] = [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
        ];
        const bbox = computeBoundingBox(positions)!;
        const transform = createRadarTransform(bbox, SIZE);
        const dots = normalizePositions(positions, transform, SIZE);

        expect(dots).toHaveLength(2);
        expect(dots[0]!.x).toBeLessThan(dots[1]!.x);
        expect(dots[0]!.y).toBe(dots[1]!.y);
    });

    it('keeps all dots within bounds (with padding)', () => {
        const positions: NodePosition[] = [
            { x: -500, y: -300 },
            { x: 800, y: 600 },
            { x: 0, y: 0 },
        ];
        const bbox = computeBoundingBox(positions)!;
        const transform = createRadarTransform(bbox, SIZE);
        const dots = normalizePositions(positions, transform, SIZE);

        dots.forEach((dot) => {
            expect(dot.x).toBeGreaterThanOrEqual(0);
            expect(dot.x).toBeLessThanOrEqual(SIZE);
            expect(dot.y).toBeGreaterThanOrEqual(0);
            expect(dot.y).toBeLessThanOrEqual(SIZE);
        });
    });

    it('preserves aspect ratio for non-square bounding box', () => {
        const positions: NodePosition[] = [
            { x: 0, y: 0 },
            { x: 200, y: 100 },
        ];
        const bbox = computeBoundingBox(positions)!;
        const transform = createRadarTransform(bbox, SIZE);
        const dots = normalizePositions(positions, transform, SIZE);

        const dx = Math.abs(dots[1]!.x - dots[0]!.x);
        const dy = Math.abs(dots[1]!.y - dots[0]!.y);
        expect(dx).toBeGreaterThan(dy);
        expect(dx / dy).toBeCloseTo(2, 1);
    });
});

describe('mapViewportToRadar', () => {
    const SIZE = 32;

    // Helper: create a standard transform for a 1000x1000 canvas
    function makeTransform() {
        const bbox = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
        return createRadarTransform(bbox, SIZE)!;
    }

    it('maps a centred viewport correctly', () => {
        const t = makeTransform();
        // Viewport at origin, zoom 1, container 500x500
        const rect = mapViewportToRadar(0, 0, 1, 500, 500, t, SIZE);
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.w).toBeGreaterThan(0);
        expect(rect.h).toBeGreaterThan(0);
    });

    it('increases rect size when zooming out', () => {
        const t = makeTransform();
        const zoomedIn = mapViewportToRadar(0, 0, 2, 800, 600, t, SIZE);
        const zoomedOut = mapViewportToRadar(0, 0, 0.5, 800, 600, t, SIZE);
        expect(zoomedOut.w).toBeGreaterThan(zoomedIn.w);
        expect(zoomedOut.h).toBeGreaterThan(zoomedIn.h);
    });

    it('shifts rect when panning', () => {
        const t = makeTransform();
        const origin = mapViewportToRadar(0, 0, 1, 800, 600, t, SIZE);
        // Pan right by 200px → world shifts left → rect x increases
        const panned = mapViewportToRadar(-200, 0, 1, 800, 600, t, SIZE);
        expect(panned.x).toBeGreaterThan(origin.x);
    });

    it('clamps rect to radar bounds using intersection logic', () => {
        const t = makeTransform();
        // Extreme negative pan (world shifting right, rawX is deeply negative).
        // A naive clamp of rawX to 0 would incorrectly shift the entire rect into view,
        // but intersection logic correctly reduces the width or sets it to 0.
        const rect = mapViewportToRadar(10000, 10000, 0.01, 2000, 2000, t, SIZE);
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.w).toBeLessThanOrEqual(SIZE);
        expect(rect.y + rect.h).toBeLessThanOrEqual(SIZE);
        // Because we panned so far away, the rect should actually have zero intersection width/height
        expect(rect.w).toBe(0);
        expect(rect.h).toBe(0);
    });

    it('returns non-zero rect for typical viewport', () => {
        const t = makeTransform();
        const rect = mapViewportToRadar(-100, -50, 1, 1200, 900, t, SIZE);
        expect(rect.w).toBeGreaterThan(0);
        expect(rect.h).toBeGreaterThan(0);
    });
});
