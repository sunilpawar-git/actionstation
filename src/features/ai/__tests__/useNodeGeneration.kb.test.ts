/**
 * useNodeGeneration - Knowledge Bank context integration tests
 * Split from useNodeGeneration.test.ts to stay within 300-line limit
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { useNodeGeneration } from '../hooks/useNodeGeneration';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import * as geminiService from '../services/geminiService';
import type { IdeaNodeData } from '@/features/canvas/types/node';
import { TierLimitsProvider } from '@/features/subscription/contexts/TierLimitsContext';

vi.mock('../services/geminiService', () => ({
    generateContent: vi.fn(),
    generateContentWithContext: vi.fn(),
}));

const mockGetKBContext = vi.fn(() => '');
vi.mock('@/features/knowledgeBank/hooks/useKnowledgeBankContext', () => ({
    useKnowledgeBankContext: () => ({ getKBContext: mockGetKBContext }),
}));

vi.mock('@/features/canvas/contexts/PanToNodeContext', () => ({
    usePanToNodeContext: () => ({ panToPosition: vi.fn() }),
}));

vi.mock('../hooks/useNodePoolContext', () => ({
    useNodePoolContext: () => ({ getPoolContext: vi.fn(() => '') }),
}));

vi.mock('@/features/subscription/hooks/useNodeCreationGuard', () => ({
    useNodeCreationGuard: () => ({ guardNodeCreation: () => true }),
}));

// Wrapper for TierLimitsProvider
function wrapper({ children }: { children: ReactNode }) {
    return React.createElement(TierLimitsProvider, null, children);
}

const createTestIdeaNode = (id: string, prompt: string, output?: string) => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea' as const,
    data: { prompt, output, isGenerating: false, isPromptCollapsed: false } as IdeaNodeData,
    position: { x: 0, y: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe('useNodeGeneration - Knowledge Bank context', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
    });

    it('should pass KB context to generateContentWithContext', async () => {
        const kbBlock = '--- Workspace Knowledge Bank ---\n[Knowledge: Brand Voice]\nAlways use CAPITAL TEXT.\n--- End Knowledge Bank ---';
        mockGetKBContext.mockReturnValue(kbBlock);

        useCanvasStore.getState().addNode(createTestIdeaNode('idea-1', 'Test prompt'));
        vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('RESPONSE');

        const { result } = renderHook(() => useNodeGeneration(), { wrapper });
        await act(async () => {
            await result.current.generateFromPrompt('idea-1');
        });

        expect(geminiService.generateContentWithContext).toHaveBeenCalledWith(
            'Test prompt',
            [],
            '',
            kbBlock,
            undefined
        );
    });

    it('should pass empty string when no KB entries are enabled', async () => {
        mockGetKBContext.mockReturnValue('');

        useCanvasStore.getState().addNode(createTestIdeaNode('idea-1', 'Test prompt'));
        vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Response');

        const { result } = renderHook(() => useNodeGeneration(), { wrapper });
        await act(async () => {
            await result.current.generateFromPrompt('idea-1');
        });

        expect(geminiService.generateContentWithContext).toHaveBeenCalledWith(
            'Test prompt',
            [],
            '',
            '',
            undefined
        );
    });
});
