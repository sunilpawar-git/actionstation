/**
 * Spiral Placement — Finds the nearest open slot around a target position
 * using an expanding rectangular spiral search.
 *
 * Pure function — no Zustand, no side effects.
 * Used by freeFlowPlacementService, gridLayoutService, snapToMasonrySlot,
 * synthesisPosition, expandInsightService, and useQuickCapture.
 */
import type { CanvasNode, NodePosition } from '../types/node';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';
import { GRID_GAP } from './gridConstants';

/** Maximum number of spiral rings to search before giving up */
export const MAX_SPIRAL_RINGS = 10;

/** Step size for each spiral ring expansion */
const SPIRAL_STEP_X = DEFAULT_NODE_WIDTH + GRID_GAP;
const SPIRAL_STEP_Y = DEFAULT_NODE_HEIGHT + GRID_GAP;

/**
 * 8 directional offsets for each ring, applied in order:
 * right → below-right → below → below-left → left → above-left → above → above-right
 */
const DIRECTION_OFFSETS: ReadonlyArray<{ dx: number; dy: number }> = [
    { dx: 1, dy: 0 },
    { dx: 1, dy: 1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: -1, dy: -1 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: -1 },
];

/**
 * Checks if a candidate rectangle collides with any existing node.
 */
export function collidesWithAny(
    x: number,
    y: number,
    width: number,
    height: number,
    nodes: CanvasNode[],
): boolean {
    for (const node of nodes) {
        const nw = node.width ?? DEFAULT_NODE_WIDTH;
        const nh = node.height ?? DEFAULT_NODE_HEIGHT;
        const overlapX = x < node.position.x + nw && x + width > node.position.x;
        const overlapY = y < node.position.y + nh && y + height > node.position.y;
        if (overlapX && overlapY) return true;
    }
    return false;
}

/**
 * Searches for the nearest non-colliding position starting from (anchorX, anchorY)
 * using an expanding spiral pattern.
 *
 * @param anchorX  - Starting X coordinate
 * @param anchorY  - Starting Y coordinate
 * @param width    - Width of the node to place
 * @param height   - Height of the node to place
 * @param nodes    - All existing nodes to check against
 * @returns The nearest open position, or a safe fallback below all nodes
 */
export function findNearestOpenSlot(
    anchorX: number,
    anchorY: number,
    width: number,
    height: number,
    nodes: CanvasNode[],
): NodePosition {
    if (!collidesWithAny(anchorX, anchorY, width, height, nodes)) {
        return { x: anchorX, y: anchorY };
    }

    for (let ring = 1; ring <= MAX_SPIRAL_RINGS; ring++) {
        for (const dir of DIRECTION_OFFSETS) {
            const candidateX = anchorX + dir.dx * ring * SPIRAL_STEP_X;
            const candidateY = anchorY + dir.dy * ring * SPIRAL_STEP_Y;

            if (!collidesWithAny(candidateX, candidateY, width, height, nodes)) {
                return { x: candidateX, y: candidateY };
            }
        }
    }

    let maxBottom = anchorY;
    for (const node of nodes) {
        const bottom = node.position.y + (node.height ?? DEFAULT_NODE_HEIGHT);
        if (bottom > maxBottom) maxBottom = bottom;
    }
    return { x: anchorX, y: maxBottom + GRID_GAP };
}
