/**
 * useIdeaCardDuplicateAction hook tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdeaCardDuplicateAction } from '../useIdeaCardDuplicateAction';
import { useCanvasStore } from '../../stores/canvasStore';
import { toast } from '@/shared/stores/toastStore';

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

const mockPanToPosition = vi.fn();
vi.mock('../../contexts/PanToNodeContext', () => ({
    usePanToNodeContext: () => ({ panToPosition: mockPanToPosition }),
}));

const makeNode = () => ({
    id: 'idea-1',
    workspaceId: 'ws-1',
    type: 'idea' as const,
    data: { heading: 'Test', output: 'Output', isGenerating: false, isPromptCollapsed: false },
    position: { x: 0, y: 0 },
    width: 280,
    height: 220,
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe('useIdeaCardDuplicateAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
    });

    it('returns handleDuplicate callback', () => {
        const { result } = renderHook(() => useIdeaCardDuplicateAction('idea-1'));
        expect(typeof result.current.handleDuplicate).toBe('function');
    });

    it('shows success toast on successful duplicate', () => {
        useCanvasStore.setState({ nodes: [makeNode()] });
        const { result } = renderHook(() => useIdeaCardDuplicateAction('idea-1'));
        act(() => result.current.handleDuplicate());
        expect(toast.success).toHaveBeenCalledWith('Node duplicated');
    });

    it('shows error toast when node not found', () => {
        const { result } = renderHook(() => useIdeaCardDuplicateAction('nonexistent'));
        act(() => result.current.handleDuplicate());
        expect(toast.error).toHaveBeenCalledWith('Failed to duplicate node');
    });

    it('pans to the new node position after successful duplicate (deferred via rAF)', () => {
        vi.useFakeTimers();
        useCanvasStore.setState({ nodes: [makeNode()] });
        const { result } = renderHook(() => useIdeaCardDuplicateAction('idea-1'));
        act(() => result.current.handleDuplicate());
        // Pan is deferred to next frame to avoid viewport mutation during React batch
        expect(mockPanToPosition).not.toHaveBeenCalled();
        act(() => { vi.advanceTimersByTime(16); }); // one rAF tick
        expect(mockPanToPosition).toHaveBeenCalledOnce();
        const [x, y] = mockPanToPosition.mock.calls[0] as [number, number];
        expect(typeof x).toBe('number');
        expect(typeof y).toBe('number');
        vi.useRealTimers();
    });

    it('does not pan when node is not found', () => {
        const { result } = renderHook(() => useIdeaCardDuplicateAction('nonexistent'));
        act(() => result.current.handleDuplicate());
        expect(mockPanToPosition).not.toHaveBeenCalled();
    });
});
