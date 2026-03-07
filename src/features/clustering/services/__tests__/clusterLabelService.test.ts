import { describe, it, expect, vi, beforeEach } from 'vitest';
import { labelClusters } from '../clusterLabelService';
import type { ClusterGroup } from '../../types/cluster';
import type { CanvasNode } from '@/features/canvas/types/node';

vi.mock('@/features/knowledgeBank/services/geminiClient', () => ({
    callGemini: vi.fn(),
    extractGeminiText: vi.fn(),
}));

import { callGemini, extractGeminiText } from '@/features/knowledgeBank/services/geminiClient';

const mockCallGemini = vi.mocked(callGemini);
const mockExtractText = vi.mocked(extractGeminiText);

function makeNode(id: string, heading: string): CanvasNode {
    return {
        id,
        workspaceId: 'w1',
        type: 'idea',
        data: { heading },
        position: { x: 0, y: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
    } as CanvasNode;
}

const NODES: CanvasNode[] = [
    makeNode('n1', 'React hooks'),
    makeNode('n2', 'React state'),
    makeNode('n3', 'Database design'),
    makeNode('n4', 'SQL queries'),
    makeNode('n5', 'Node.js APIs'),
];

const CLUSTER_A: ClusterGroup = {
    id: 'ca', nodeIds: ['n1', 'n2'], label: 'Cluster 1', colorIndex: 0,
};
const CLUSTER_B: ClusterGroup = {
    id: 'cb', nodeIds: ['n3', 'n4'], label: 'Cluster 2', colorIndex: 1,
};
const CLUSTER_C: ClusterGroup = {
    id: 'cc', nodeIds: ['n5'], label: 'Cluster 3', colorIndex: 2,
};

beforeEach(() => {
    vi.resetAllMocks();
});

describe('labelClusters', () => {
    it('updates label from single Gemini call', async () => {
        mockCallGemini.mockResolvedValue({ ok: true, status: 200, data: {} });
        mockExtractText.mockReturnValue('Frontend State\nData Layer');

        const result = await labelClusters([CLUSTER_A, CLUSTER_B], NODES);
        expect(mockCallGemini).toHaveBeenCalledTimes(1);
        expect(result[0]!.label).toBe('Frontend State');
        expect(result[1]!.label).toBe('Data Layer');
    });

    it('3 clusters use single Gemini call with all groups', async () => {
        mockCallGemini.mockResolvedValue({ ok: true, status: 200, data: {} });
        mockExtractText.mockReturnValue('Frontend\nBackend\nAPIs');

        await labelClusters([CLUSTER_A, CLUSTER_B, CLUSTER_C], NODES);
        expect(mockCallGemini).toHaveBeenCalledTimes(1);

        const bodyArg = mockCallGemini.mock.calls[0]![0];
        const promptText = (bodyArg.contents[0]!.parts[0]! as { text: string }).text;
        expect(promptText).toContain('Group 1');
        expect(promptText).toContain('Group 2');
        expect(promptText).toContain('Group 3');
    });

    it('keeps default labels on Gemini error', async () => {
        mockCallGemini.mockRejectedValue(new Error('network'));

        const result = await labelClusters([CLUSTER_A], NODES);
        expect(result[0]!.label).toBe('Cluster 1');
    });

    it('truncates labels longer than 40 characters', async () => {
        const longLabel = 'A'.repeat(60);
        mockCallGemini.mockResolvedValue({ ok: true, status: 200, data: {} });
        mockExtractText.mockReturnValue(longLabel);

        const result = await labelClusters([CLUSTER_A], NODES);
        expect(result[0]!.label.length).toBeLessThanOrEqual(40);
    });

    it('keeps defaults for unmatched clusters when response has fewer lines', async () => {
        mockCallGemini.mockResolvedValue({ ok: true, status: 200, data: {} });
        mockExtractText.mockReturnValue('Only One Label');

        const result = await labelClusters([CLUSTER_A, CLUSTER_B], NODES);
        expect(result[0]!.label).toBe('Only One Label');
        expect(result[1]!.label).toBe('Cluster 2');
    });

    it('strips leading numbers from response lines', async () => {
        mockCallGemini.mockResolvedValue({ ok: true, status: 200, data: {} });
        mockExtractText.mockReturnValue('1. Frontend State\n2) Data Layer');

        const result = await labelClusters([CLUSTER_A, CLUSTER_B], NODES);
        expect(result[0]!.label).toBe('Frontend State');
        expect(result[1]!.label).toBe('Data Layer');
    });

    it('limits headings per cluster to 5 in prompt', async () => {
        const bigCluster: ClusterGroup = {
            id: 'big',
            nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n1', 'n2'],
            label: 'Big',
            colorIndex: 0,
        };
        mockCallGemini.mockResolvedValue({ ok: true, status: 200, data: {} });
        mockExtractText.mockReturnValue('Big Group');

        await labelClusters([bigCluster], NODES);
        const bodyArg = mockCallGemini.mock.calls[0]![0];
        const promptText = (bodyArg.contents[0]!.parts[0]! as { text: string }).text;
        const headingLines = promptText.split('\n').filter((l: string) => l.startsWith('- "'));
        expect(headingLines.length).toBeLessThanOrEqual(5);
    });

    it('only labels the largest 10 clusters when more than 10', async () => {
        const clusters = Array.from({ length: 12 }, (_, i) => ({
            id: `c${i}`, nodeIds: ['n1', 'n2'], label: `Cluster ${i + 1}`, colorIndex: i % 8,
        }));
        mockCallGemini.mockResolvedValue({ ok: true, status: 200, data: {} });
        mockExtractText.mockReturnValue(Array.from({ length: 10 }, (_, i) => `Label ${i}`).join('\n'));

        const result = await labelClusters(clusters, NODES);
        expect(result[10]!.label).toBe('Cluster 11');
        expect(result[11]!.label).toBe('Cluster 12');
    });

    it('uses clusterStrings for prompt construction', async () => {
        mockCallGemini.mockResolvedValue({ ok: true, status: 200, data: {} });
        mockExtractText.mockReturnValue('Test');

        await labelClusters([CLUSTER_A], NODES);
        const bodyArg = mockCallGemini.mock.calls[0]![0];
        const promptText = (bodyArg.contents[0]!.parts[0]! as { text: string }).text;
        expect(promptText).toContain('labeling groups of related ideas');
        expect(promptText).toContain('Group 1');
    });

    it('sanitizes HTML tags from labels', async () => {
        mockCallGemini.mockResolvedValue({ ok: true, status: 200, data: {} });
        mockExtractText.mockReturnValue('<b>Frontend</b> State');

        const result = await labelClusters([CLUSTER_A], NODES);
        expect(result[0]!.label).toBe('Frontend State');
    });

    it('preserves default labels when extractGeminiText returns null', async () => {
        mockCallGemini.mockResolvedValue({ ok: true, status: 200, data: {} });
        mockExtractText.mockReturnValue(null);

        const result = await labelClusters([CLUSTER_A, CLUSTER_B], NODES);
        expect(result[0]!.label).toBe('Cluster 1');
        expect(result[1]!.label).toBe('Cluster 2');
    });
});
