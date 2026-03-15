/**
 * Cross-Mode Collision Integration Tests
 * Verifies that masonry placement and snap-to-masonry avoid overlapping
 * nodes that were placed in free-flow mode at arbitrary positions.
 *
 * Pure function tests — no React rendering, no Zustand subscriptions.
 */
import { describe, it, expect } from 'vitest';
import { createIdeaNode, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';
import type { CanvasNode, NodePosition } from '../types/node';
import { GRID_GAP, GRID_PADDING, GRID_COLUMNS } from '../services/gridConstants';
import { calculateMasonryPosition } from '../services/gridLayoutService';
import { snapToMasonrySlot } from '../services/snapToMasonrySlot';
import { collidesWithAny } from '../services/spiralPlacement';
import { getDefaultColumnX } from '../types/masonryLayout';

const WS = 'test-ws';

function makeNode(id: string, x: number, y: number, dateOffset: number): CanvasNode {
    const node = createIdeaNode(id, WS, { x, y });
    node.createdAt = new Date(Date.UTC(2024, 0, 1 + dateOffset));
    return node;
}

function assertNoCollision(position: NodePosition, nodes: CanvasNode[]): void {
    expect(
        collidesWithAny(position.x, position.y, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes),
    ).toBe(false);
}

describe('calculateMasonryPosition — cross-mode collision', () => {
    it('avoids a free-flow node sitting at the computed masonry target', () => {
        // Scenario: 1 grid node (col 0 row 0), 1 free-flow node placed at col 2 row 0.
        // Masonry sorts by createdAt: g0(date=0)->col0, ff(date=1)->col1.
        // columnY = [292, 292, 32, 32]. Target = col2 (672, 32).
        // But ff's ACTUAL position is (672, 32) — exact collision!
        const col0X = getDefaultColumnX(0, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
        const col2X = getDefaultColumnX(2, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);

        const gridNode = makeNode('g0', col0X, GRID_PADDING, 0);
        const freeFlowBlocker = makeNode('ff', col2X, GRID_PADDING, 1);

        const allNodes = [gridNode, freeFlowBlocker];
        const position = calculateMasonryPosition(allNodes, GRID_COLUMNS);

        assertNoCollision(position, allNodes);
    });

    it('avoids free-flow node partially overlapping the masonry target', () => {
        // Same setup but ff is offset so it partially overlaps the target slot.
        const col0X = getDefaultColumnX(0, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
        const col2X = getDefaultColumnX(2, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);

        const gridNode = makeNode('g0', col0X, GRID_PADDING, 0);
        const freeFlowNode = makeNode('ff', col2X + 50, GRID_PADDING + 30, 1);

        const allNodes = [gridNode, freeFlowNode];
        const position = calculateMasonryPosition(allNodes, GRID_COLUMNS);

        assertNoCollision(position, allNodes);
    });

    it('preserves standard masonry behavior with no off-grid nodes', () => {
        const col0X = getDefaultColumnX(0, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
        const col1X = getDefaultColumnX(1, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
        const col2X = getDefaultColumnX(2, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
        const col3X = getDefaultColumnX(3, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
        const row1Y = GRID_PADDING + DEFAULT_NODE_HEIGHT + GRID_GAP;

        const gridNodes = [
            makeNode('g0', col0X, GRID_PADDING, 0),
            makeNode('g1', col1X, GRID_PADDING, 1),
            makeNode('g2', col2X, GRID_PADDING, 2),
            makeNode('g3', col3X, GRID_PADDING, 3),
        ];

        const position = calculateMasonryPosition(gridNodes, GRID_COLUMNS);

        expect(position.x).toBe(col0X);
        expect(position.y).toBe(row1Y);
    });

    it('returned position never collides — blocker at col0 row1 target', () => {
        // 4 grid nodes fill row 0 (dates 0-3). Target = col0 row1 (32, 292).
        // A free-flow node (date 4) sits exactly at (32, 292).
        // Masonry virtual: assigns dates 0-3 to cols 0-3 row0, date 4 to col0 row1.
        // Virtual target for node 6 = col1 row1 (352, 292). But the ff node's
        // ACTUAL position is (32, 292) — which IS the virtual position too.
        // So this particular case aligns. We need ff at a position that diverges.
        //
        // Better: 5 grid nodes (dates 0-4). Virtual: col0-3 row0, col0 row1.
        // Target = col1 row1 (352, 292).
        // Free-flow node (date=-1, earliest) placed at (352, 292).
        // Virtual assignment: ff(-1)->col0, g0(0)->col1, g1(1)->col2, g2(2)->col3,
        //                     g3(3)->col0 row1, g4(4)->col1 row1
        // Now 6 nodes. Target = col2 row1 (672, 292).
        // Put another ff at (672, 292). That's the collision.
        const col0X = getDefaultColumnX(0, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
        const col1X = getDefaultColumnX(1, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
        const col2X = getDefaultColumnX(2, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
        const col3X = getDefaultColumnX(3, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
        const row1Y = GRID_PADDING + DEFAULT_NODE_HEIGHT + GRID_GAP;

        // Earliest ff placed at the computed target position
        const ffBlocker = makeNode('ffB', col2X, row1Y, -1);

        const gridNodes = [
            makeNode('g0', col0X, GRID_PADDING, 0),
            makeNode('g1', col1X, GRID_PADDING, 1),
            makeNode('g2', col2X, GRID_PADDING, 2),
            makeNode('g3', col3X, GRID_PADDING, 3),
            makeNode('g4', col0X, row1Y, 4),
        ];

        const allNodes = [ffBlocker, ...gridNodes];
        const position = calculateMasonryPosition(allNodes, GRID_COLUMNS);
        assertNoCollision(position, allNodes);
    });
});

describe('snapToMasonrySlot — cross-mode collision', () => {
    it('avoids a pinned node at the snap target (pinned nodes are invisible to findColumnBottomY)', () => {
        // findColumnBottomY skips pinned nodes. A pinned node at the snap target
        // makes the algorithm blind to the obstacle. The collision guard catches this.
        const col1X = getDefaultColumnX(1, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);

        const pinnedNode = makeNode('pinned', col1X, GRID_PADDING, 0);
        pinnedNode.data = { ...pinnedNode.data, isPinned: true };
        const allNodes = [pinnedNode];

        // Click near col1. findColumnBottomY returns GRID_PADDING (pinned is skipped).
        // Snap target = (col1X, GRID_PADDING) — collides with pinned node.
        const clickPos = { x: col1X + 50, y: 200 };
        const position = snapToMasonrySlot(clickPos, allNodes, GRID_COLUMNS);

        assertNoCollision(position, allNodes);
    });

    it('avoids pinned node below an unpinned node in the same column', () => {
        const col0X = getDefaultColumnX(0, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
        const row1Y = GRID_PADDING + DEFAULT_NODE_HEIGHT + GRID_GAP;

        const unpinnedNode = makeNode('g0', col0X, GRID_PADDING, 0);
        // Pinned at row1 — findColumnBottomY won't count it, snaps to row1Y
        const pinnedBlocker = makeNode('pinB', col0X, row1Y, 1);
        pinnedBlocker.data = { ...pinnedBlocker.data, isPinned: true };
        const allNodes = [unpinnedNode, pinnedBlocker];

        const clickPos = { x: col0X + 10, y: 500 };
        const position = snapToMasonrySlot(clickPos, allNodes, GRID_COLUMNS);

        assertNoCollision(position, allNodes);
    });

    it('preserves standard snap behavior with no pinned/off-grid nodes', () => {
        const col2X = getDefaultColumnX(2, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);

        const gridNode = makeNode('g0', col2X, GRID_PADDING, 0);
        const allNodes = [gridNode];
        const expectedY = GRID_PADDING + DEFAULT_NODE_HEIGHT + GRID_GAP;

        const clickPos = { x: col2X + 100, y: 500 };
        const position = snapToMasonrySlot(clickPos, allNodes, GRID_COLUMNS);

        expect(position.x).toBe(col2X);
        expect(position.y).toBe(expectedY);
    });
});
