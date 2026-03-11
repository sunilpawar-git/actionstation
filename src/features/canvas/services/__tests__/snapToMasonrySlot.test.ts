/**
 * snapToMasonrySlot — Unit tests for snapping arbitrary click positions
 * to the nearest masonry grid slot.
 *
 * Tests cover: column snapping, Y insertion, empty canvas,
 * boundary clamping, pinned-node exclusion.
 */
import { describe, it, expect } from 'vitest';
import { snapToMasonrySlot } from '../snapToMasonrySlot';
import { GRID_COLUMNS, GRID_GAP, GRID_PADDING } from '../gridConstants';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, type CanvasNode } from '../../types/node';
import { getDefaultColumnX } from '../../types/masonryLayout';

/** Helper: create a minimal CanvasNode for test */
function makeNode(id: string, x: number, y: number, opts?: Partial<CanvasNode>): CanvasNode {
    return {
        id,
        workspaceId: 'ws-test',
        type: 'idea',
        data: {
            heading: '',
            isPinned: opts?.data?.isPinned ?? false,
            isCollapsed: false,
            isGenerating: false,
            isPromptCollapsed: false,
            colorKey: 'default',
        },
        position: { x, y },
        width: opts?.width ?? DEFAULT_NODE_WIDTH,
        height: opts?.height ?? DEFAULT_NODE_HEIGHT,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...opts,
        // Re-apply position after spread to avoid override
    } as CanvasNode;
}

/** Column X positions for reference */
const COL_X = Array.from({ length: GRID_COLUMNS }, (_, i) =>
    getDefaultColumnX(i, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING),
);

describe('snapToMasonrySlot', () => {
    it('snaps to nearest column on empty canvas', () => {
        // x=500 is closest to column 1 (center ~492), so snaps to col1 X
        const result = snapToMasonrySlot({ x: 500, y: 300 }, []);
        expect(result.x).toBe(COL_X[1]);
        expect(result.y).toBe(GRID_PADDING);
    });

    it('snaps click near column 0 to column 0 X', () => {
        const result = snapToMasonrySlot({ x: 50, y: 100 }, []);
        expect(result.x).toBe(GRID_PADDING);
    });

    it('snaps click near column 1 center to column 1 X', () => {
        const col1Center = COL_X[1]! + DEFAULT_NODE_WIDTH / 2;
        const result = snapToMasonrySlot({ x: col1Center, y: 100 }, []);
        expect(result.x).toBe(COL_X[1]);
    });

    it('snaps click near column 2 to column 2 X', () => {
        const col2Center = COL_X[2]! + DEFAULT_NODE_WIDTH / 2;
        const result = snapToMasonrySlot({ x: col2Center, y: 100 }, []);
        expect(result.x).toBe(COL_X[2]);
    });

    it('snaps click near column 3 to column 3 X', () => {
        const col3Center = COL_X[3]! + DEFAULT_NODE_WIDTH / 2;
        const result = snapToMasonrySlot({ x: col3Center, y: 100 }, []);
        expect(result.x).toBe(COL_X[3]);
    });

    it('clamps click far to the left to column 0', () => {
        const result = snapToMasonrySlot({ x: -500, y: 100 }, []);
        expect(result.x).toBe(GRID_PADDING);
    });

    it('clamps click far to the right to last column', () => {
        const result = snapToMasonrySlot({ x: 9999, y: 100 }, []);
        expect(result.x).toBe(COL_X[GRID_COLUMNS - 1]);
    });

    it('places Y below existing nodes in the target column', () => {
        const existing = makeNode('n1', COL_X[0]!, GRID_PADDING);
        const result = snapToMasonrySlot({ x: 50, y: 100 }, [existing]);

        // Should be placed below the existing node: GRID_PADDING + DEFAULT_NODE_HEIGHT + GRID_GAP
        const expectedY = GRID_PADDING + DEFAULT_NODE_HEIGHT + GRID_GAP;
        expect(result.y).toBe(expectedY);
    });

    it('uses GRID_PADDING Y in an empty column', () => {
        // Node in column 0; click in column 1 (empty)
        const existing = makeNode('n1', COL_X[0]!, GRID_PADDING);
        const result = snapToMasonrySlot({ x: COL_X[1]!, y: 200 }, [existing]);
        expect(result.y).toBe(GRID_PADDING);
    });

    it('stacks below multiple nodes in the same column', () => {
        const n1 = makeNode('n1', COL_X[0]!, GRID_PADDING);
        const n2 = makeNode('n2', COL_X[0]!, GRID_PADDING + DEFAULT_NODE_HEIGHT + GRID_GAP);

        const result = snapToMasonrySlot({ x: 50, y: 100 }, [n1, n2]);

        const expectedY = GRID_PADDING + 2 * (DEFAULT_NODE_HEIGHT + GRID_GAP);
        expect(result.y).toBe(expectedY);
    });

    it('excludes pinned nodes from column occupancy', () => {
        const pinned = makeNode('pinned', COL_X[0]!, GRID_PADDING, {
            data: {
                heading: '', isPinned: true, isCollapsed: false,
                isGenerating: false, isPromptCollapsed: false, colorKey: 'default',
            },
        });

        const result = snapToMasonrySlot({ x: 50, y: 100 }, [pinned]);

        // Pinned node excluded — column 0 should be treated as empty
        expect(result.y).toBe(GRID_PADDING);
    });

    it('returns valid NodePosition type', () => {
        const result = snapToMasonrySlot({ x: 100, y: 100 }, []);
        expect(typeof result.x).toBe('number');
        expect(typeof result.y).toBe('number');
        expect(Number.isFinite(result.x)).toBe(true);
        expect(Number.isFinite(result.y)).toBe(true);
    });
});
