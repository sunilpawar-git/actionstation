/**
 * useFindSimilar — Hook Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFindSimilar } from '../useFindSimilar';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';

describe('useFindSimilar', () => {
    beforeEach(() => {
        // Need 6+ diverse nodes so shared terms between n1 & n2 get non-zero IDF
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'n1', workspaceId: 'ws-1', type: 'idea',
                    data: { heading: 'React hooks state management', output: 'useState useEffect useReducer context custom hooks' },
                    position: { x: 0, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
                },
                {
                    id: 'n2', workspaceId: 'ws-1', type: 'idea',
                    data: { heading: 'React hooks patterns guide', output: 'useState useEffect patterns hooks tutorial' },
                    position: { x: 100, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
                },
                {
                    id: 'n3', workspaceId: 'ws-1', type: 'idea',
                    data: { heading: 'Italian pasta recipe fresh', output: 'Italian cuisine Mediterranean cooking ingredients' },
                    position: { x: 200, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
                },
                {
                    id: 'n4', workspaceId: 'ws-1', type: 'idea',
                    data: { heading: 'Photography tips camera', output: 'aperture shutter exposure lens settings' },
                    position: { x: 300, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
                },
                {
                    id: 'n5', workspaceId: 'ws-1', type: 'idea',
                    data: { heading: 'Guitar chords music theory', output: 'acoustic electric strings melody rhythm' },
                    position: { x: 400, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
                },
                {
                    id: 'n6', workspaceId: 'ws-1', type: 'idea',
                    data: { heading: 'Gardening plants flowers', output: 'roses tulips sunflowers garden soil' },
                    position: { x: 500, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
                },
                {
                    id: 'n7', workspaceId: 'ws-1', type: 'idea',
                    data: { heading: 'Travel backpacking adventure', output: 'hiking camping mountains trails gear' },
                    position: { x: 600, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
                },
                {
                    id: 'n8', workspaceId: 'ws-1', type: 'idea',
                    data: { heading: 'Finance investing stocks', output: 'portfolio dividends market growth bonds' },
                    position: { x: 700, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
                },
            ],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    it('initially returns no results, isActive=false, isComputing=false', () => {
        const { result } = renderHook(() => useFindSimilar());
        expect(result.current.results).toHaveLength(0);
        expect(result.current.isActive).toBe(false);
        expect(result.current.isComputing).toBe(false);
    });

    it('findSimilar(nodeId) activates and returns results', () => {
        const { result } = renderHook(() => useFindSimilar());
        act(() => { result.current.findSimilar('n1'); });
        expect(result.current.isActive).toBe(true);
        // Results should include n2 (similar) but not n3 (dissimilar)
        expect(result.current.results.some((r) => r.nodeId === 'n2')).toBe(true);
    });

    it('clearSimilar resets to initial state', () => {
        const { result } = renderHook(() => useFindSimilar());
        act(() => { result.current.findSimilar('n1'); });
        act(() => { result.current.clearSimilar(); });
        expect(result.current.isActive).toBe(false);
        expect(result.current.results).toHaveLength(0);
    });

    it('handles missing source node gracefully', () => {
        const { result } = renderHook(() => useFindSimilar());
        act(() => { result.current.findSimilar('nonexistent'); });
        expect(result.current.results).toHaveLength(0);
    });

    it('results list never exceeds topN (default 7)', () => {
        // Add many similar nodes
        const manyNodes = Array.from({ length: 20 }, (_, i) => ({
            id: `sim-${i}`, workspaceId: 'ws-1', type: 'idea' as const,
            data: { heading: `React hooks variant ${i}`, output: `useState useEffect variant ${i}` },
            position: { x: i * 100, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
        }));
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'source', workspaceId: 'ws-1', type: 'idea',
                    data: { heading: 'React hooks tutorial', output: 'useState useEffect guide' },
                    position: { x: 0, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
                },
                ...manyNodes,
            ],
            edges: [], selectedNodeIds: new Set(),
        });
        const { result } = renderHook(() => useFindSimilar());
        act(() => { result.current.findSimilar('source'); });
        expect(result.current.results.length).toBeLessThanOrEqual(7);
    });
});
