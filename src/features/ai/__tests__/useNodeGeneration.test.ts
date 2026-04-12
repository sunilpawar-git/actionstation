/**
 * useNodeGeneration Hook Tests - Tests for IdeaCard generation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useNodeGeneration } from '../hooks/useNodeGeneration';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import * as geminiService from '../services/geminiService';
import type { IdeaNodeData } from '@/features/canvas/types/node';
import { TierLimitsProvider } from '@/features/subscription/contexts/TierLimitsContext';
import React from 'react';

// Mock gemini service
vi.mock('../services/geminiService', () => ({
    generateContent: vi.fn(),
    generateContentWithContext: vi.fn(),
}));

vi.mock('@/features/canvas/contexts/PanToNodeContext', () => ({
    usePanToNodeContext: () => ({ panToPosition: vi.fn() }),
}));

// Mock KB context hook
const mockGetKBContext = vi.fn(() => '');
vi.mock('@/features/knowledgeBank/hooks/useKnowledgeBankContext', () => ({
    useKnowledgeBankContext: () => ({ getKBContext: mockGetKBContext }),
}));

// Mock Node Pool context hook
const mockGetPoolContext = vi.fn(() => '');
vi.mock('../hooks/useNodePoolContext', () => ({
    useNodePoolContext: () => ({ getPoolContext: mockGetPoolContext }),
}));

vi.mock('@/features/subscription/hooks/useNodeCreationGuard', () => ({
    useNodeCreationGuard: () => ({ guardNodeCreation: () => true }),
}));

// Wrapper for TierLimitsProvider
function wrapper({ children }: { children: ReactNode }) {
    return React.createElement(TierLimitsProvider, null, children);
}

// Helper to create IdeaCard node
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

/** Helper: add an edge between two nodes */
function addEdge(sourceId: string, targetId: string, edgeId = 'edge-1') {
    useCanvasStore.getState().addEdge({
        id: edgeId, workspaceId: 'ws-1',
        sourceNodeId: sourceId, targetNodeId: targetId, relationshipType: 'related',
    });
}

/** Helper: generate and return the call args */
async function generateAndGetCall(nodeId: string) {
    vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Response');
    const { result } = renderHook(() => useNodeGeneration(), { wrapper });
    await act(async () => { await result.current.generateFromPrompt(nodeId); });
    return vi.mocked(geminiService.generateContentWithContext).mock.calls[0];
}

describe('useNodeGeneration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
    });

    describe('generateFromPrompt', () => {
        it('should update IdeaCard output in-place (no new node)', async () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-1', 'Test prompt'));

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Generated output');

            const { result } = renderHook(() => useNodeGeneration(), { wrapper });

            await act(async () => {
                await result.current.generateFromPrompt('idea-1');
            });

            const state = useCanvasStore.getState();
            // Should still have only 1 node
            expect(state.nodes).toHaveLength(1);
            // Output should be updated in-place
            expect((state.nodes[0]?.data!).output).toBe('Generated output');
        });

        it('should use the LATEST prompt content, not stale closure data', async () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-1', 'Initial prompt'));

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('AI Response');

            const { result } = renderHook(() => useNodeGeneration(), { wrapper });

            // Update prompt AFTER hook is initialized
            act(() => {
                useCanvasStore.getState().updateNodePrompt('idea-1', 'Updated prompt');
            });

            await act(async () => {
                await result.current.generateFromPrompt('idea-1');
            });

            // Should use 'Updated prompt', NOT 'Initial prompt'
            expect(geminiService.generateContentWithContext).toHaveBeenCalledWith(
                'Updated prompt',
                [],
                '',
                '',
                undefined
            );
        });

        it('should use heading as prompt source (SSOT) over prompt field', async () => {
            useCanvasStore.getState().addNode(
                createTestIdeaNode('idea-1', 'old prompt', undefined, 'Heading prompt'),
            );

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('AI Response');

            const { result } = renderHook(() => useNodeGeneration(), { wrapper });

            await act(async () => {
                await result.current.generateFromPrompt('idea-1');
            });

            // Should use heading, NOT prompt field
            expect(geminiService.generateContentWithContext).toHaveBeenCalledWith(
                'Heading prompt',
                [],
                '',
                '',
                undefined
            );
        });

        it('should fall back to prompt field when heading is empty (legacy data)', async () => {
            useCanvasStore.getState().addNode(
                createTestIdeaNode('idea-1', 'Legacy prompt', undefined, ''),
            );

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('AI Response');

            const { result } = renderHook(() => useNodeGeneration(), { wrapper });

            await act(async () => {
                await result.current.generateFromPrompt('idea-1');
            });

            expect(geminiService.generateContentWithContext).toHaveBeenCalledWith(
                'Legacy prompt',
                [],
                '',
                '',
                undefined
            );
        });

        it('should not create node if prompt is empty', async () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-1', ''));

            const { result } = renderHook(() => useNodeGeneration(), { wrapper });

            await act(async () => {
                await result.current.generateFromPrompt('idea-1');
            });

            expect(geminiService.generateContentWithContext).not.toHaveBeenCalled();
        });

        it('should set generating state while processing', async () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-1', 'Test'));

            let generatingState: boolean | undefined;
            vi.mocked(geminiService.generateContentWithContext).mockImplementation(async () => {
                generatingState = (useCanvasStore.getState().nodes[0]?.data!).isGenerating;
                return 'Response';
            });

            const { result } = renderHook(() => useNodeGeneration(), { wrapper });

            await act(async () => {
                await result.current.generateFromPrompt('idea-1');
            });

            // Should have been true during generation
            expect(generatingState).toBe(true);
            // Should be false after completion
            expect((useCanvasStore.getState().nodes[0]?.data!).isGenerating).toBe(false);
        });
    });

    describe('generateFromPrompt with upstream context', () => {
        it('should include upstream IdeaCard prompts in context', async () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-parent', 'Parent prompt'));
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-child', 'Child prompt'));
            addEdge('idea-parent', 'idea-child');

            const call = await generateAndGetCall('idea-child');
            expect(call?.[0]).toBe('Child prompt');
            expect(call?.[1]).toEqual(expect.arrayContaining(['Parent prompt']));
        });

        it('should include upstream Note content (output) in context', async () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('node-1', '', 'Note content'));
            useCanvasStore.getState().addNode(createTestIdeaNode('node-2', 'AI prompt'));
            addEdge('node-1', 'node-2');

            const call = await generateAndGetCall('node-2');
            expect(call?.[0]).toBe('AI prompt');
            expect(call?.[1]).toEqual(expect.arrayContaining(['Note content']));
        });

        it('should prioritize output over prompt for context when both exist', async () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('parent', 'Parent prompt', 'Parent output', 'Parent Heading'));
            useCanvasStore.getState().addNode(createTestIdeaNode('child', 'Child prompt'));
            addEdge('parent', 'child');

            const call = await generateAndGetCall('child');
            expect(call?.[1]).toEqual(expect.arrayContaining(['Parent Heading\n\nParent output']));
        });

        it('should preserve chronological order in multi-level chains', async () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('grandparent', 'Grandparent idea'));
            useCanvasStore.getState().addNode(createTestIdeaNode('parent', 'Parent evolution'));
            useCanvasStore.getState().addNode(createTestIdeaNode('child', 'Child synthesis'));
            addEdge('grandparent', 'parent', 'e1');
            addEdge('parent', 'child', 'e2');

            const call = await generateAndGetCall('child');
            expect(call?.[1]).toEqual(['Grandparent idea', 'Parent evolution']);
        });

        it('should exclude unconnected nodes from context', async () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-connected', 'Connected prompt'));
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-unconnected', 'Unconnected prompt'));
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-target', 'Target prompt'));
            addEdge('idea-connected', 'idea-target');

            const call = await generateAndGetCall('idea-target');
            expect(call?.[1]).toContain('Connected prompt');
            expect(call?.[1]).not.toContain('Unconnected prompt');
        });
    });

    // Heading inclusion tests are in useNodeGeneration.heading.test.ts
    // Knowledge Bank context tests are in useNodeGeneration.kb.test.ts
    // branchFromNode tests are in useNodeGeneration.branch.test.ts
});
