/**
 * Radar Helpers — Pure functions for canvas radar coordinate mapping.
 * Zero React / zero store dependencies. Fully unit-testable.
 */
import type { NodePosition } from '../types/node';

/** Axis-aligned bounding box for a set of node positions */
export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

/** A position normalized into the radar's coordinate space (0..size) */
export interface RadarDot {
    x: number;
    y: number;
}

/**
 * Reusable transform that maps canvas coordinates into radar space.
 * Shared by both dot rendering and viewport indicator rendering.
 */
export interface RadarTransform {
    scale: number;
    offsetX: number;
    offsetY: number;
    minX: number;
    minY: number;
}

/** Viewport rectangle mapped into radar coordinate space */
export interface RadarViewportRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** Padding ratio applied inside the squircle to prevent dots touching edges */
const PADDING_RATIO = 0.15;

/**
 * Computes the axis-aligned bounding box for an array of node positions.
 * Returns `null` when the array is empty (no nodes = no radar dots).
 */
export function computeBoundingBox(positions: readonly NodePosition[]): BoundingBox | null {
    if (positions.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pos of positions) {
        if (pos.x < minX) minX = pos.x;
        if (pos.y < minY) minY = pos.y;
        if (pos.x > maxX) maxX = pos.x;
        if (pos.y > maxY) maxY = pos.y;
    }

    return { minX, minY, maxX, maxY };
}

/**
 * Creates a reusable transform for mapping canvas → radar coordinates.
 * Returns `null` when the bounding box has zero area (single/stacked nodes).
 */
export function createRadarTransform(bbox: BoundingBox, size: number): RadarTransform | null {
    const bboxW = bbox.maxX - bbox.minX;
    const bboxH = bbox.maxY - bbox.minY;

    if (bboxW === 0 && bboxH === 0) return null;

    const pad = size * PADDING_RATIO;
    const usable = size - 2 * pad;
    const scale = usable / Math.max(bboxW, bboxH);

    const scaledW = bboxW * scale;
    const scaledH = bboxH * scale;
    const offsetX = pad + (usable - scaledW) / 2;
    const offsetY = pad + (usable - scaledH) / 2;

    return { scale, offsetX, offsetY, minX: bbox.minX, minY: bbox.minY };
}

/**
 * Normalizes node positions into the radar's squircle coordinate space.
 * Uses a pre-computed RadarTransform when available; centers when null.
 */
export function normalizePositions(
    positions: readonly NodePosition[],
    transform: RadarTransform | null,
    size: number,
): RadarDot[] {
    if (!transform) {
        const center = size / 2;
        return positions.map(() => ({ x: center, y: center }));
    }

    return positions.map((pos) => ({
        x: transform.offsetX + (pos.x - transform.minX) * transform.scale,
        y: transform.offsetY + (pos.y - transform.minY) * transform.scale,
    }));
}

/**
 * Maps a ReactFlow viewport into a clamped rectangle in radar space.
 *
 * ReactFlow viewport: { x, y, zoom } where:
 *   - x, y = translation offset of the canvas (pixels)
 *   - zoom = scale factor
 *
 * The visible canvas region in world coordinates is:
 *   left   = -x / zoom
 *   top    = -y / zoom
 *   width  = containerW / zoom
 *   height = containerH / zoom
 *
 * Clamps the result to [0, radarSize] to prevent overflow.
 */
export function mapViewportToRadar(
    viewportX: number,
    viewportY: number,
    zoom: number,
    containerW: number,
    containerH: number,
    transform: RadarTransform,
    radarSize: number,
): RadarViewportRect {
    // Convert viewport to canvas world coordinates
    const worldLeft = -viewportX / zoom;
    const worldTop = -viewportY / zoom;
    const worldWidth = containerW / zoom;
    const worldHeight = containerH / zoom;

    // Map world coordinates into radar space using the shared transform
    const rawX = transform.offsetX + (worldLeft - transform.minX) * transform.scale;
    const rawY = transform.offsetY + (worldTop - transform.minY) * transform.scale;
    const rawW = worldWidth * transform.scale;
    const rawH = worldHeight * transform.scale;

    // Clamp to radar bounds [0, radarSize] using intersection math
    const minX = Math.max(rawX, 0);
    const maxX = Math.min(rawX + rawW, radarSize);
    const minY = Math.max(rawY, 0);
    const maxY = Math.min(rawY + rawH, radarSize);

    const x = minX;
    const y = minY;
    const w = Math.max(0, maxX - minX);
    const h = Math.max(0, maxY - minY);

    return { x, y, w, h };
}
