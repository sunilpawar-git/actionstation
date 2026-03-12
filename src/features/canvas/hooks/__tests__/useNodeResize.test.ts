/**
 * useNodeResize Hook Tests - TDD: Write tests FIRST
 * Tests for node resize increment functionality
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeResize } from '../useNodeResize';
import { useCanvasStore } from '../../stores/canvasStore';
import {
    RESIZE_INCREMENT_PX,
    MAX_NODE_WIDTH,
    MAX_NODE_HEIGHT,
    DEFAULT_NODE_WIDTH,
    DEFAULT_NODE_HEIGHT,
    MINDMAP_MIN_WIDTH,
    MINDMAP_MIN_HEIGHT,
    createIdeaNode,
} from '../../types/node';

describe('useNodeResize', () => {
    const TEST_NODE_ID = 'test-node-1';
    const TEST_WORKSPACE_ID = 'test-workspace';

    beforeEach(() => {
        // Reset store before each test
        useCanvasStore.getState().clearCanvas();
    });

    describe('with default-sized node', () => {
        beforeEach(() => {
            const node = createIdeaNode(TEST_NODE_ID, TEST_WORKSPACE_ID, { x: 0, y: 0 });
            useCanvasStore.getState().addNode(node);
        });

        it('should return canExpandWidth as true when below max width', () => {
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));
            expect(result.current.canExpandWidth).toBe(true);
        });

        it('should return canExpandHeight as true when below max height', () => {
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));
            expect(result.current.canExpandHeight).toBe(true);
        });

        it('should expand width by RESIZE_INCREMENT_PX on expandWidth call', () => {
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));

            act(() => {
                result.current.expandWidth();
            });

            const node = useCanvasStore.getState().nodes.find((n) => n.id === TEST_NODE_ID);
            expect(node?.width).toBe(DEFAULT_NODE_WIDTH + RESIZE_INCREMENT_PX);
        });

        it('should expand height by RESIZE_INCREMENT_PX on expandHeight call', () => {
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));

            act(() => {
                result.current.expandHeight();
            });

            const node = useCanvasStore.getState().nodes.find((n) => n.id === TEST_NODE_ID);
            expect(node?.height).toBe(DEFAULT_NODE_HEIGHT + RESIZE_INCREMENT_PX);
        });

        it('should allow multiple width expansions', () => {
            const { result, rerender } = renderHook(() => useNodeResize(TEST_NODE_ID));

            // First expansion
            act(() => {
                result.current.expandWidth();
            });

            // Re-render to get updated hook state
            rerender();

            // Second expansion
            act(() => {
                result.current.expandWidth();
            });

            const node = useCanvasStore.getState().nodes.find((n) => n.id === TEST_NODE_ID);
            expect(node?.width).toBe(DEFAULT_NODE_WIDTH + RESIZE_INCREMENT_PX * 2);
        });
    });

    describe('at max dimensions', () => {
        beforeEach(() => {
            const node = createIdeaNode(TEST_NODE_ID, TEST_WORKSPACE_ID, { x: 0, y: 0 });
            useCanvasStore.getState().addNode(node);
            // Set node to max dimensions
            useCanvasStore.getState().updateNodeDimensions(TEST_NODE_ID, MAX_NODE_WIDTH, MAX_NODE_HEIGHT);
        });

        it('should return canExpandWidth as false when at max width', () => {
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));
            expect(result.current.canExpandWidth).toBe(false);
        });

        it('should return canExpandHeight as false when at max height', () => {
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));
            expect(result.current.canExpandHeight).toBe(false);
        });

        it('should not change width when expandWidth called at max', () => {
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));

            act(() => {
                result.current.expandWidth();
            });

            const node = useCanvasStore.getState().nodes.find((n) => n.id === TEST_NODE_ID);
            expect(node?.width).toBe(MAX_NODE_WIDTH);
        });

        it('should not change height when expandHeight called at max', () => {
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));

            act(() => {
                result.current.expandHeight();
            });

            const node = useCanvasStore.getState().nodes.find((n) => n.id === TEST_NODE_ID);
            expect(node?.height).toBe(MAX_NODE_HEIGHT);
        });
    });

    describe('near max dimensions', () => {
        it('should clamp width to max when increment would exceed', () => {
            const nearMaxWidth = MAX_NODE_WIDTH - 10; // Just below max
            const node = createIdeaNode(TEST_NODE_ID, TEST_WORKSPACE_ID, { x: 0, y: 0 });
            useCanvasStore.getState().addNode(node);
            useCanvasStore.getState().updateNodeDimensions(TEST_NODE_ID, nearMaxWidth, DEFAULT_NODE_HEIGHT);

            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));

            act(() => {
                result.current.expandWidth();
            });

            const updatedNode = useCanvasStore.getState().nodes.find((n) => n.id === TEST_NODE_ID);
            expect(updatedNode?.width).toBe(MAX_NODE_WIDTH);
        });

        it('should clamp height to max when increment would exceed', () => {
            const nearMaxHeight = MAX_NODE_HEIGHT - 10; // Just below max
            const node = createIdeaNode(TEST_NODE_ID, TEST_WORKSPACE_ID, { x: 0, y: 0 });
            useCanvasStore.getState().addNode(node);
            useCanvasStore.getState().updateNodeDimensions(TEST_NODE_ID, DEFAULT_NODE_WIDTH, nearMaxHeight);

            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));

            act(() => {
                result.current.expandHeight();
            });

            const updatedNode = useCanvasStore.getState().nodes.find((n) => n.id === TEST_NODE_ID);
            expect(updatedNode?.height).toBe(MAX_NODE_HEIGHT);
        });
    });

    describe('with non-existent node', () => {
        it('should return canExpandWidth as true for non-existent node (uses defaults)', () => {
            const { result } = renderHook(() => useNodeResize('non-existent-id'));
            expect(result.current.canExpandWidth).toBe(true);
        });

        it('should not throw when expandWidth called on non-existent node', () => {
            const { result } = renderHook(() => useNodeResize('non-existent-id'));

            expect(() => {
                act(() => {
                    result.current.expandWidth();
                });
            }).not.toThrow();
        });
    });

    describe('mindmap mode — canShrink respects MINDMAP_MIN dimensions', () => {
        beforeEach(() => {
            const node = createIdeaNode(TEST_NODE_ID, TEST_WORKSPACE_ID, { x: 0, y: 0 });
            useCanvasStore.getState().addNode(node);
            // Switch to mindmap mode and set to exactly the mindmap minimum size
            useCanvasStore.getState().updateNodeContentMode(TEST_NODE_ID, 'mindmap');
            useCanvasStore.getState().updateNodeDimensions(TEST_NODE_ID, MINDMAP_MIN_WIDTH, MINDMAP_MIN_HEIGHT);
        });

        it('canShrinkWidth is false at MINDMAP_MIN_WIDTH (cannot shrink below mindmap floor)', () => {
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));
            expect(result.current.canShrinkWidth).toBe(false);
        });

        it('canShrinkHeight is false at MINDMAP_MIN_HEIGHT (cannot shrink below mindmap floor)', () => {
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));
            expect(result.current.canShrinkHeight).toBe(false);
        });

        it('canShrinkWidth is true when wider than MINDMAP_MIN_WIDTH', () => {
            useCanvasStore.getState().updateNodeDimensions(
                TEST_NODE_ID, MINDMAP_MIN_WIDTH + RESIZE_INCREMENT_PX, MINDMAP_MIN_HEIGHT,
            );
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));
            expect(result.current.canShrinkWidth).toBe(true);
        });

        it('canShrinkHeight is true when taller than MINDMAP_MIN_HEIGHT', () => {
            useCanvasStore.getState().updateNodeDimensions(
                TEST_NODE_ID, MINDMAP_MIN_WIDTH, MINDMAP_MIN_HEIGHT + RESIZE_INCREMENT_PX,
            );
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));
            expect(result.current.canShrinkHeight).toBe(true);
        });

        it('shrinkWidth does not go below MINDMAP_MIN_WIDTH', () => {
            useCanvasStore.getState().updateNodeDimensions(
                TEST_NODE_ID, MINDMAP_MIN_WIDTH + RESIZE_INCREMENT_PX, MINDMAP_MIN_HEIGHT,
            );
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));
            act(() => { result.current.shrinkWidth(); });
            const node = useCanvasStore.getState().nodes.find(n => n.id === TEST_NODE_ID);
            expect(node?.width).toBeGreaterThanOrEqual(MINDMAP_MIN_WIDTH);
        });

        it('shrinkHeight does not go below MINDMAP_MIN_HEIGHT', () => {
            useCanvasStore.getState().updateNodeDimensions(
                TEST_NODE_ID, MINDMAP_MIN_WIDTH, MINDMAP_MIN_HEIGHT + RESIZE_INCREMENT_PX,
            );
            const { result } = renderHook(() => useNodeResize(TEST_NODE_ID));
            act(() => { result.current.shrinkHeight(); });
            const node = useCanvasStore.getState().nodes.find(n => n.id === TEST_NODE_ID);
            expect(node?.height).toBeGreaterThanOrEqual(MINDMAP_MIN_HEIGHT);
        });
    });

    describe('masonry re-arrangement after resize', () => {
        it('should trigger arrangeAfterResize after expandWidth', () => {
            // Setup: Multiple nodes in grid
            const node1 = createIdeaNode('node-1', TEST_WORKSPACE_ID, { x: 32, y: 32 });
            const node2 = createIdeaNode('node-2', TEST_WORKSPACE_ID, { x: 352, y: 32 });
            node1.createdAt = new Date('2024-01-01');
            node2.createdAt = new Date('2024-01-02');

            useCanvasStore.getState().addNode(node1);
            useCanvasStore.getState().addNode(node2);

            const { result } = renderHook(() => useNodeResize('node-1'));

            act(() => {
                result.current.expandWidth();
            });

            // After expand, node-2 should be shifted right to accommodate wider node-1
            // node-1 width: 280 + 96 = 376
            // node-2 new x: 32 + 376 + 40 = 448
            const updatedNode2 = useCanvasStore.getState().nodes.find((n) => n.id === 'node-2');
            expect(updatedNode2?.position.x).toBe(448);
        });

        it('should trigger arrangeAfterResize after expandHeight', () => {
            // Setup: Create 2 nodes stacked in column 0
            const node1 = createIdeaNode('node-1', TEST_WORKSPACE_ID, { x: 32, y: 32 });
            const node2 = createIdeaNode('node-2', TEST_WORKSPACE_ID, { x: 32, y: 292 }); // Stacked below node-1

            node1.createdAt = new Date('2024-01-01');
            node2.createdAt = new Date('2024-01-02');

            useCanvasStore.getState().addNode(node1);
            useCanvasStore.getState().addNode(node2);

            const { result } = renderHook(() => useNodeResize('node-1'));

            // Expand node-1 height
            act(() => {
                result.current.expandHeight();
            });

            // With only 2 nodes, node-2 will be in col 1 after masonry runs
            // (col 0 is shortest first, then col 1)
            // node-1 height: 220 + 96 = 316
            // node-2 goes to col 1, y: 32 (row 1)
            const updatedNode2 = useCanvasStore.getState().nodes.find((n) => n.id === 'node-2');
            // Node-2 should now be at y: 32 (col 1, first position)
            expect(updatedNode2?.position.y).toBe(32);
            // And x should be col 1: 32 + 280 + 40 = 352
            expect(updatedNode2?.position.x).toBe(352);
        });
    });
});
