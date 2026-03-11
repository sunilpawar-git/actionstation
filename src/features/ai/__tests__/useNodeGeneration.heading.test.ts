/**
 * useNodeGeneration - Heading inclusion in upstream context tests
 * Split from useNodeGeneration.test.ts to stay within 300-line limit
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeGeneration } from '../hooks/useNodeGeneration';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import * as geminiService from '../services/geminiService';
import type { IdeaNodeData } from '@/features/canvas/types/node';

vi.mock('../services/geminiService', () => ({
    generateContent: vi.fn(),
    generateContentWithContext: vi.fn(),
}));

vi.mock('@/features/knowledgeBank/hooks/useKnowledgeBankContext', () => ({
    useKnowledgeBankContext: () => ({ getKBContext: vi.fn(() => '') }),
}));

vi.mock('@/features/canvas/contexts/PanToNodeContext', () => ({
    usePanToNodeContext: () => ({ panToPosition: vi.fn() }),
}));

vi.mock('../hooks/useNodePoolContext', () => ({
    useNodePoolContext: () => ({ getPoolContext: vi.fn(() => '') }),
}));

const createTestIdeaNode = (id: string, prompt: string, output?: string, heading?: string) => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea' as const,
    data: {
        heading,
        prompt,
        output,
        isGenerating: false,
        isPromptCollapsed: false,
    } as IdeaNodeData,
    position: { x: 0, y: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
});

function addEdge(sourceId: string, targetId: string, edgeId = 'edge-1') {
    useCanvasStore.getState().addEdge({
        id: edgeId, workspaceId: 'ws-1',
        sourceNodeId: sourceId, targetNodeId: targetId, relationshipType: 'related',
    });
}

async function generateAndGetCall(nodeId: string) {
    vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Response');
    const { result } = renderHook(() => useNodeGeneration());
    await act(async () => { await result.current.generateFromPrompt(nodeId); });
    return vi.mocked(geminiService.generateContentWithContext).mock.calls[0];
}

describe('useNodeGeneration - heading inclusion in upstream context', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
    });

    it('should include heading + output when parent has both', async () => {
        useCanvasStore.getState().addNode(
            createTestIdeaNode('parent', '', 'Body content', 'Parent Heading')
        );
        useCanvasStore.getState().addNode(
            createTestIdeaNode('child', 'Child prompt')
        );
        addEdge('parent', 'child');

        const call = await generateAndGetCall('child');
        expect(call?.[1]).toEqual(['Parent Heading\n\nBody content']);
    });

    it('should use only heading when no output exists', async () => {
        useCanvasStore.getState().addNode(
            createTestIdeaNode('parent', '', undefined, 'Just a heading')
        );
        useCanvasStore.getState().addNode(
            createTestIdeaNode('child', 'Child prompt')
        );
        addEdge('parent', 'child');

        const call = await generateAndGetCall('child');
        expect(call?.[1]).toEqual(['Just a heading']);
    });

    it('should use only output when heading is empty', async () => {
        useCanvasStore.getState().addNode(
            createTestIdeaNode('parent', '', 'Only output', '')
        );
        useCanvasStore.getState().addNode(
            createTestIdeaNode('child', 'Child prompt')
        );
        addEdge('parent', 'child');

        const call = await generateAndGetCall('child');
        expect(call?.[1]).toEqual(['Only output']);
    });

    it('should handle multi-level chain with heading + output combinations', async () => {
        useCanvasStore.getState().addNode(
            createTestIdeaNode('gp', '', 'GP output', 'GP heading')
        );
        useCanvasStore.getState().addNode(
            createTestIdeaNode('p', '', undefined, 'P heading')
        );
        useCanvasStore.getState().addNode(
            createTestIdeaNode('child', 'Child prompt')
        );
        addEdge('gp', 'p', 'e1');
        addEdge('p', 'child', 'e2');

        const call = await generateAndGetCall('child');
        expect(call?.[1]).toEqual([
            'GP heading\n\nGP output',
            'P heading'
        ]);
    });

    it('should fall back to prompt when no heading or output', async () => {
        useCanvasStore.getState().addNode(
            createTestIdeaNode('parent', 'Legacy prompt', undefined, '')
        );
        useCanvasStore.getState().addNode(
            createTestIdeaNode('child', 'Child prompt')
        );
        addEdge('parent', 'child');

        const call = await generateAndGetCall('child');
        expect(call?.[1]).toEqual(['Legacy prompt']);
    });
});
