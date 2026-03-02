import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeDimensions } from '../useNodeDimensions';
import { createIdeaNode, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../types/node';

const makeNode = (id: string) => createIdeaNode(id, 'ws-1', { x: 0, y: 0 });

describe('useNodeDimensions', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [makeNode('n1')], edges: [] });
    });

    it('returns default dimensions for non-existent node', () => {
        const { result } = renderHook(() => useNodeDimensions('missing'));
        expect(result.current).toEqual({ width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT });
    });

    it('does NOT re-render on position-only changes', () => {
        let renderCount = 0;
        const { result } = renderHook(() => {
            renderCount++;
            return useNodeDimensions('n1');
        });
        const firstDims = result.current;
        renderCount = 0;

        act(() => {
            useCanvasStore.getState().updateNodePosition('n1', { x: 500, y: 500 });
        });

        expect(renderCount).toBe(0);
        expect(result.current).toBe(firstDims);
    });

    it('DOES re-render when width/height changes', () => {
        const { result } = renderHook(() => useNodeDimensions('n1'));

        act(() => {
            useCanvasStore.getState().updateNodeDimensions('n1', 400, 300);
        });

        expect(result.current).toEqual({ width: 400, height: 300 });
    });

    it('returns stable object reference when dims unchanged', () => {
        const { result } = renderHook(() => useNodeDimensions('n1'));
        const firstDims = result.current;

        act(() => {
            useCanvasStore.getState().updateNodeOutput('n1', 'new content');
        });

        expect(result.current).toBe(firstDims);
    });
});
