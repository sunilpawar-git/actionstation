/**
 * Free Flow Placement Service Tests
 * Tests pure placement functions with spiral collision avoidance
 */
import { describe, it, expect } from 'vitest';
import {
    calculateSmartPlacement,
    calculateBranchPlacement,
} from '../freeFlowPlacementService';
import type { CanvasNode } from '../../types/node';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../types/node';
import { GRID_GAP, GRID_PADDING } from '../gridLayoutService';

const STEP_X = DEFAULT_NODE_WIDTH + GRID_GAP;
const STEP_Y = DEFAULT_NODE_HEIGHT + GRID_GAP;

const createMockNode = (
    id: string,
    x: number,
    y: number,
    overrides?: Partial<CanvasNode>
): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    position: { x, y },
    data: { prompt: '', output: '', tags: [] },
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
});

describe('freeFlowPlacementService', () => {
    describe('calculateSmartPlacement', () => {
        it('should place first node at grid padding origin', () => {
            const position = calculateSmartPlacement([]);
            expect(position).toEqual({ x: GRID_PADDING, y: GRID_PADDING });
        });

        it('should place new node to the right of the latest node', () => {
            const nodes = [createMockNode('n1', 32, 32)];
            const position = calculateSmartPlacement(nodes);
            expect(position.x).toBe(32 + STEP_X);
            expect(position.y).toBe(32);
        });

        it('should place beside the focused node when focusedNodeId is provided', () => {
            const nodes = [
                createMockNode('n1', 32, 32),
                createMockNode('n2', 800, 800),
            ];
            const position = calculateSmartPlacement(nodes, 'n1');
            expect(position.x).toBe(32 + STEP_X);
            expect(position.y).toBe(32);
        });

        it('should avoid collision using spiral search', () => {
            const targetX = 32 + STEP_X;
            const nodes = [
                createMockNode('n1', 32, 32),
                createMockNode('n2', targetX, 32),
            ];
            const position = calculateSmartPlacement(nodes);

            const collidesWithN1 = position.x < 32 + DEFAULT_NODE_WIDTH && position.x + DEFAULT_NODE_WIDTH > 32 &&
                position.y < 32 + DEFAULT_NODE_HEIGHT && position.y + DEFAULT_NODE_HEIGHT > 32;
            const collidesWithN2 = position.x < targetX + DEFAULT_NODE_WIDTH && position.x + DEFAULT_NODE_WIDTH > targetX &&
                position.y < 32 + DEFAULT_NODE_HEIGHT && position.y + DEFAULT_NODE_HEIGHT > 32;

            expect(collidesWithN1).toBe(false);
            expect(collidesWithN2).toBe(false);
        });

        it('should find an open slot among multiple blocking nodes', () => {
            const targetX = 32 + STEP_X;
            const nodes = [
                createMockNode('n1', 32, 32),
                createMockNode('n2', targetX, 32),
                createMockNode('n3', targetX, 32 + STEP_Y),
            ];
            const position = calculateSmartPlacement(nodes);

            for (const node of nodes) {
                const overlapX = position.x < node.position.x + DEFAULT_NODE_WIDTH &&
                    position.x + DEFAULT_NODE_WIDTH > node.position.x;
                const overlapY = position.y < node.position.y + DEFAULT_NODE_HEIGHT &&
                    position.y + DEFAULT_NODE_HEIGHT > node.position.y;
                expect(overlapX && overlapY).toBe(false);
            }
        });

        it('should use latest node by createdAt when no focusedNodeId', () => {
            const nodes = [
                createMockNode('n1', 32, 32, { createdAt: new Date('2024-01-01') }),
                createMockNode('n2', 500, 100, { createdAt: new Date('2024-01-02') }),
            ];
            const position = calculateSmartPlacement(nodes);
            expect(position.x).toBe(500 + STEP_X);
            expect(position.y).toBe(100);
        });

        it('should fall back to collision-free origin area when focusedNodeId not found', () => {
            const nodes = [createMockNode('n1', 200, 200)];
            const position = calculateSmartPlacement(nodes, 'nonexistent-id');

            for (const node of nodes) {
                const overlapX = position.x < node.position.x + (node.width ?? DEFAULT_NODE_WIDTH) &&
                    position.x + DEFAULT_NODE_WIDTH > node.position.x;
                const overlapY = position.y < node.position.y + (node.height ?? DEFAULT_NODE_HEIGHT) &&
                    position.y + DEFAULT_NODE_HEIGHT > node.position.y;
                expect(overlapX && overlapY).toBe(false);
            }
        });

        it('should respect custom node widths for offset calculation', () => {
            const wideWidth = 500;
            const nodes = [
                createMockNode('n1', 32, 32, { width: wideWidth }),
            ];
            const position = calculateSmartPlacement(nodes);
            expect(position.x).toBe(32 + wideWidth + GRID_GAP);
            expect(position.y).toBe(32);
        });
    });

    describe('calculateBranchPlacement', () => {
        it('should place branch to the right of the source node', () => {
            const source = createMockNode('src', 100, 100);
            const position = calculateBranchPlacement(source, [source]);
            expect(position.x).toBe(100 + STEP_X);
            expect(position.y).toBe(100);
        });

        it('should resolve collision when sibling exists at branch position', () => {
            const source = createMockNode('src', 100, 100);
            const branchX = 100 + STEP_X;
            const sibling = createMockNode('sib', branchX, 100);
            const position = calculateBranchPlacement(source, [source, sibling]);

            const collidesWithSibling = position.x < branchX + DEFAULT_NODE_WIDTH &&
                position.x + DEFAULT_NODE_WIDTH > branchX &&
                position.y < 100 + DEFAULT_NODE_HEIGHT &&
                position.y + DEFAULT_NODE_HEIGHT > 100;
            expect(collidesWithSibling).toBe(false);
        });

        it('should find open slot among multiple siblings', () => {
            const source = createMockNode('src', 100, 100);
            const branchX = 100 + STEP_X;
            const sib1 = createMockNode('sib1', branchX, 100);
            const sib2 = createMockNode('sib2', branchX, 100 + STEP_Y);
            const position = calculateBranchPlacement(source, [source, sib1, sib2]);

            for (const node of [sib1, sib2]) {
                const overlapX = position.x < node.position.x + DEFAULT_NODE_WIDTH &&
                    position.x + DEFAULT_NODE_WIDTH > node.position.x;
                const overlapY = position.y < node.position.y + DEFAULT_NODE_HEIGHT &&
                    position.y + DEFAULT_NODE_HEIGHT > node.position.y;
                expect(overlapX && overlapY).toBe(false);
            }
        });

        it('should respect source node custom width', () => {
            const wideWidth = 600;
            const source = createMockNode('src', 100, 100, { width: wideWidth });
            const position = calculateBranchPlacement(source, [source]);
            expect(position.x).toBe(100 + wideWidth + GRID_GAP);
            expect(position.y).toBe(100);
        });

        it('should handle source at origin', () => {
            const source = createMockNode('src', 0, 0);
            const position = calculateBranchPlacement(source, [source]);
            expect(position.x).toBe(STEP_X);
            expect(position.y).toBe(0);
        });
    });
});
