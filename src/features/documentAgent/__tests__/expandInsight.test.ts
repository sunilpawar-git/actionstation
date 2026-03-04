/**
 * Expand Insight to Nodes Tests — fan layout and node expansion
 */
import { describe, it, expect, vi } from 'vitest';
import { strings } from '@/shared/localization/strings';
import { createMockExtraction } from './fixtures/extractionFixtures';

vi.mock('../../canvas/services/freeFlowPlacementService', () => ({
    calculateBranchPlacement: vi.fn().mockReturnValue({ x: 400, y: 0 }),
}));

vi.mock('../../canvas/services/gridLayoutService', () => ({
    calculateMasonryPosition: vi.fn().mockReturnValue({ x: 0, y: 300 }),
}));

/* eslint-disable import-x/first -- Must import after vi.mock */
import { expandInsightToNodes } from '../services/expandInsightService';
import type { CanvasNode } from '@/features/canvas/types/node';
/* eslint-enable import-x/first */

const fullResult = createMockExtraction({
    summary: 'Monthly electricity bill.',
    keyFacts: ['Amount: $142'],
    actionItems: ['Pay by Friday'],
    questions: ['Is auto-pay on?'],
    extendedFacts: ['Vendor: Power Corp'],
});

const insightNode: CanvasNode = {
    id: 'insight-1',
    workspaceId: 'ws-1',
    type: 'idea',
    data: { heading: strings.documentAgent.insightHeading, output: 'markdown...' },
    position: { x: 400, y: 100 },
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('expandInsightToNodes', () => {
    const parentDocNodeId = 'doc-node-1';

    it('creates one child node per non-empty section', () => {
        const result = expandInsightToNodes(insightNode, fullResult, parentDocNodeId);

        expect(result.nodes.length).toBeGreaterThanOrEqual(4);
    });

    it('summary node has success colorKey', () => {
        const result = expandInsightToNodes(insightNode, fullResult, parentDocNodeId);
        const summaryNode = result.nodes.find((n) => n.data.output?.includes('Monthly electricity bill'));

        expect(summaryNode?.data.colorKey).toBe('success');
    });

    it('action items node has warning colorKey', () => {
        const result = expandInsightToNodes(insightNode, fullResult, parentDocNodeId);
        const actionNode = result.nodes.find((n) => n.data.output?.includes('Pay by Friday'));

        expect(actionNode?.data.colorKey).toBe('warning');
    });

    it('questions node has danger colorKey', () => {
        const result = expandInsightToNodes(insightNode, fullResult, parentDocNodeId);
        const qNode = result.nodes.find((n) => n.data.output?.includes('auto-pay'));

        expect(qNode?.data.colorKey).toBe('danger');
    });

    it('key facts node has default colorKey', () => {
        const result = expandInsightToNodes(insightNode, fullResult, parentDocNodeId);
        const factsNode = result.nodes.find((n) => n.data.output?.includes('$142'));

        expect(factsNode?.data.colorKey).toBe('default');
    });

    it('creates derived edges from each child to document node', () => {
        const result = expandInsightToNodes(insightNode, fullResult, parentDocNodeId);

        for (const edge of result.edges) {
            expect(edge.sourceNodeId).toBe(parentDocNodeId);
            expect(edge.relationshipType).toBe('derived');
        }
    });

    it('edge count matches node count', () => {
        const result = expandInsightToNodes(insightNode, fullResult, parentDocNodeId);

        expect(result.edges.length).toBe(result.nodes.length);
    });

    it('each child node has workspace ID from insight node', () => {
        const result = expandInsightToNodes(insightNode, fullResult, parentDocNodeId);

        for (const node of result.nodes) {
            expect(node.workspaceId).toBe('ws-1');
        }
    });

    it('omits sections with empty arrays', () => {
        const sparseResult = createMockExtraction({
            ...fullResult,
            keyFacts: [],
            actionItems: [],
            questions: [],
            extendedFacts: [],
        });

        const result = expandInsightToNodes(insightNode, sparseResult, parentDocNodeId);

        expect(result.nodes.length).toBe(1);
    });

    it('positions children below the insight node in fan layout', () => {
        const result = expandInsightToNodes(insightNode, fullResult, parentDocNodeId);

        for (const node of result.nodes) {
            expect(node.position.y).toBeGreaterThanOrEqual(insightNode.position.y);
        }
    });
});
