/**
 * Free Flow Placement Service - Pure functions for free-flow node positioning
 * Handles smart placement and branch placement with spiral collision avoidance
 */
import type { CanvasNode, NodePosition } from '../types/node';
import { getNodeMap } from '../stores/canvasStore';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';
import { GRID_GAP, GRID_PADDING } from './gridConstants';
import { findNearestOpenSlot } from './spiralPlacement';

/**
 * Calculates placement for a new node in free-flow mode.
 * Places to the right of the focused or most-recently-created node.
 * Falls back to grid padding origin on empty canvas.
 */
export function calculateSmartPlacement(
    nodes: CanvasNode[],
    focusedNodeId?: string
): NodePosition {
    if (nodes.length === 0) {
        return { x: GRID_PADDING, y: GRID_PADDING };
    }

    const anchor = focusedNodeId
        ? getNodeMap(nodes).get(focusedNodeId)
        : [...nodes].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

    if (!anchor) {
        return findNearestOpenSlot(GRID_PADDING, GRID_PADDING, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes);
    }

    const anchorWidth = anchor.width ?? DEFAULT_NODE_WIDTH;
    const targetX = anchor.position.x + anchorWidth + GRID_GAP;
    const targetY = anchor.position.y;

    return findNearestOpenSlot(
        targetX, targetY, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes,
    );
}

/**
 * Calculates placement for a branch node in free-flow mode.
 * Places to the right of the source node, resolving collisions via spiral search.
 */
export function calculateBranchPlacement(
    sourceNode: CanvasNode,
    existingNodes: CanvasNode[]
): NodePosition {
    const sourceWidth = sourceNode.width ?? DEFAULT_NODE_WIDTH;
    const targetX = sourceNode.position.x + sourceWidth + GRID_GAP;
    const targetY = sourceNode.position.y;

    const others = existingNodes.filter((n) => n.id !== sourceNode.id);
    return findNearestOpenSlot(
        targetX, targetY, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, others,
    );
}
