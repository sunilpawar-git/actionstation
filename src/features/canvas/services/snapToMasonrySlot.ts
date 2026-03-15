/**
 * snapToMasonrySlot — Snaps an arbitrary canvas position to the nearest
 * masonry grid slot. Used by double-click-to-create in masonry mode.
 *
 * Pure function: no React, no Zustand, no side effects.
 * Excludes pinned nodes from column occupancy calculations.
 */
import type { CanvasNode, NodePosition } from '../types/node';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, isNodePinned } from '../types/node';
import { getDefaultColumnX } from '../types/masonryLayout';
import { GRID_COLUMNS, GRID_GAP, GRID_PADDING } from './gridConstants';
import { collidesWithAny, findNearestOpenSlot } from './spiralPlacement';

/**
 * Finds the column index closest to the given X position.
 * Clamps to [0, GRID_COLUMNS - 1].
 */
function findNearestColumn(x: number, columnCount: number): number {
    let bestCol = 0;
    let bestDist = Infinity;

    for (let col = 0; col < columnCount; col++) {
        const colX = getDefaultColumnX(col, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
        const colCenter = colX + DEFAULT_NODE_WIDTH / 2;
        const dist = Math.abs(x - colCenter);
        if (dist < bestDist) {
            bestDist = dist;
            bestCol = col;
        }
    }

    return bestCol;
}

/**
 * Computes the bottom Y of the lowest unpinned node in a given column.
 * Returns GRID_PADDING if the column is empty.
 */
function findColumnBottomY(column: number, nodes: CanvasNode[]): number {
    const colX = getDefaultColumnX(column, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
    let bottomY = GRID_PADDING;

    for (const node of nodes) {
        if (isNodePinned(node)) continue;

        const nodeWidth = node.width ?? DEFAULT_NODE_WIDTH;
        const nodeRight = node.position.x + nodeWidth;
        const colRight = colX + DEFAULT_NODE_WIDTH;

        // Node belongs to this column if their X ranges overlap
        const overlapX = node.position.x < colRight && nodeRight > colX;
        if (!overlapX) continue;

        const nodeBottom = node.position.y + (node.height ?? DEFAULT_NODE_HEIGHT) + GRID_GAP;
        if (nodeBottom > bottomY) {
            bottomY = nodeBottom;
        }
    }

    return bottomY;
}

/**
 * Snaps an arbitrary click position to the nearest masonry grid slot.
 *
 * @param clickPosition - Flow-space position from the double-click event
 * @param nodes - Current canvas nodes (pinned nodes are excluded)
 * @returns Snapped position aligned to masonry grid
 */
export function snapToMasonrySlot(
    clickPosition: NodePosition,
    nodes: CanvasNode[],
    columnCount = GRID_COLUMNS,
): NodePosition {
    const column = findNearestColumn(clickPosition.x, columnCount);
    const x = getDefaultColumnX(column, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
    const y = findColumnBottomY(column, nodes);

    if (collidesWithAny(x, y, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes)) {
        return findNearestOpenSlot(x, y, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes);
    }
    return { x, y };
}
