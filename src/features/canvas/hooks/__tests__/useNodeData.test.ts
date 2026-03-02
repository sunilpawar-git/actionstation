import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeData } from '../useNodeData';
import { createIdeaNode } from '../../types/node';

const makeNode = (id: string) => createIdeaNode(id, 'ws-1', { x: 0, y: 0 });

describe('useNodeData', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [makeNode('n1'), makeNode('n2')], edges: [] });
    });

    it('returns undefined for non-existent node', () => {
        const { result } = renderHook(() => useNodeData('missing'));
        expect(result.current).toBeUndefined();
    });

    it('returns correct IdeaNodeData for existing node', () => {
        const { result } = renderHook(() => useNodeData('n1'));
        expect(result.current).toBeDefined();
        expect(result.current?.heading).toBe('');
    });

    it('does NOT re-render when only position changes', () => {
        let renderCount = 0;
        const { result } = renderHook(() => {
            renderCount++;
            return useNodeData('n1');
        });
        const firstData = result.current;
        renderCount = 0;

        act(() => {
            useCanvasStore.getState().updateNodePosition('n1', { x: 999, y: 999 });
        });

        expect(renderCount).toBe(0);
        expect(result.current).toBe(firstData);
    });

    it('DOES re-render when node.data.output changes', () => {
        const { result } = renderHook(() => useNodeData('n1'));
        const firstData = result.current;

        act(() => {
            useCanvasStore.getState().updateNodeOutput('n1', 'new content');
        });

        expect(result.current).not.toBe(firstData);
        expect(result.current?.output).toBe('new content');
    });

    it('returns undefined after node is deleted', () => {
        const { result } = renderHook(() => useNodeData('n1'));
        expect(result.current).toBeDefined();

        act(() => {
            useCanvasStore.getState().deleteNode('n1');
        });

        expect(result.current).toBeUndefined();
    });
});
