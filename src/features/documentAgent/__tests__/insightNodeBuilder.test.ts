/**
 * Insight Node Builder Tests — pure function for building spawn result
 */
import { describe, it, expect, vi } from 'vitest';
import { strings } from '@/shared/localization/strings';
import { createMockExtraction } from './fixtures/extractionFixtures';

vi.mock('../../canvas/services/freeFlowPlacementService', () => ({
    calculateBranchPlacement: vi.fn().mockReturnValue({ x: 400, y: 100 }),
}));

vi.mock('../../canvas/services/gridLayoutService', () => ({
    calculateMasonryPosition: vi.fn().mockReturnValue({ x: 0, y: 300 }),
}));

/* eslint-disable import-x/first -- Must import after vi.mock */
import { buildInsightSpawn, calculateInsightPosition } from '../services/insightNodeBuilder';
import type { CanvasNode } from '@/features/canvas/types/node';
/* eslint-enable import-x/first */

const mockResult = createMockExtraction();

const mockPosition = { x: 400, y: 100 };

describe('buildInsightSpawn', () => {
    it('creates node with heading from strings', () => {
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'bill.pdf');

        expect(node.data.heading).toBe(strings.documentAgent.insightHeading);
    });

    it('creates node with correct workspaceId', () => {
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'bill.pdf');

        expect(node.workspaceId).toBe('ws-1');
    });

    it('creates node with position matching input', () => {
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'bill.pdf');

        expect(node.position).toEqual(mockPosition);
    });

    it('uses default color when no parentColorKey provided', () => {
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'bill.pdf');

        expect(node.data.colorKey).toBe('default');
    });

    it('uses default color regardless of medium confidence', () => {
        const medResult = { ...mockResult, confidence: 'medium' as const };
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, medResult, 'f.pdf');

        expect(node.data.colorKey).toBe('default');
    });

    it('uses default color regardless of low confidence', () => {
        const lowResult = { ...mockResult, confidence: 'low' as const };
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, lowResult, 'f.pdf');

        expect(node.data.colorKey).toBe('default');
    });

    it('does not auto-populate tags on insight nodes', () => {
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'bill.pdf');

        expect(node.data.tags).toBeUndefined();
    });

    it('sets includeInAIPool to true', () => {
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'bill.pdf');

        expect(node.data.includeInAIPool).toBe(true);
    });

    it('creates node with id starting with insight-', () => {
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'bill.pdf');

        expect(node.id).toMatch(/^insight-/);
    });

    it('creates edge with derived relationship type', () => {
        const { edge } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'bill.pdf');

        expect(edge.relationshipType).toBe('derived');
    });

    it('creates edge connecting parent to insight (correct direction)', () => {
        const { node, edge } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'bill.pdf');

        expect(edge.sourceNodeId).toBe('parent-1');
        expect(edge.targetNodeId).toBe(node.id);
    });

    it('creates edge with correct workspaceId', () => {
        const { edge } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'bill.pdf');

        expect(edge.workspaceId).toBe('ws-1');
    });

    it('node output contains formatted markdown', () => {
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'bill.pdf');

        expect(node.data.output).toContain('Monthly bill');
    });

    it('inherits parent danger color over confidence-based success', () => {
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'f.pdf', 'danger');

        expect(node.data.colorKey).toBe('danger');
    });

    it('inherits parent warning color over confidence-based success', () => {
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'f.pdf', 'warning');

        expect(node.data.colorKey).toBe('warning');
    });

    it('inherits default when parent is default', () => {
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, mockResult, 'f.pdf', 'default');

        expect(node.data.colorKey).toBe('default');
    });

    it('inherits default when parentColorKey is undefined', () => {
        const medResult = { ...mockResult, confidence: 'medium' as const };
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, medResult, 'f.pdf');

        expect(node.data.colorKey).toBe('default');
    });

    it('inherits parent success color regardless of confidence level', () => {
        const lowResult = { ...mockResult, confidence: 'low' as const };
        const { node } = buildInsightSpawn('parent-1', 'ws-1', mockPosition, lowResult, 'f.pdf', 'success');

        expect(node.data.colorKey).toBe('success');
    });
});

describe('calculateInsightPosition', () => {
    const parentNode = { id: 'p1', position: { x: 0, y: 0 } } as CanvasNode;
    const existingNodes = [parentNode];

    it('uses branch placement in free-flow mode', () => {
        const pos = calculateInsightPosition(parentNode, existingNodes, true);

        expect(pos).toEqual({ x: 400, y: 100 });
    });

    it('uses masonry position in grid mode', () => {
        const pos = calculateInsightPosition(parentNode, existingNodes, false);

        expect(pos).toEqual({ x: 0, y: 300 });
    });
});
