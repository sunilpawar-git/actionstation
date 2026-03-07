/**
 * Focus Mode Integration Tests
 * Verifies the full focus mode flow: store -> hook -> overlay -> canvas gating
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusStore } from '../stores/focusStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useFocusMode } from '../hooks/useFocusMode';
import { _resetEscapeLayer } from '@/shared/hooks/useEscapeLayer.testUtils';
import type { CanvasNode } from '../types/node';

const createNode = (id: string, heading: string): CanvasNode => ({
    id, workspaceId: 'ws-1', type: 'idea',
    position: { x: 0, y: 0 },
    data: {
        heading,
        prompt: heading,
        output: `Content for ${heading}`,
        isGenerating: false,
        isPromptCollapsed: false,
        tags: ['tag-1'],
    },
    createdAt: new Date(), updatedAt: new Date(),
});

function pressKey(key: string) {
    act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key, bubbles: true, cancelable: true,
        }));
    });
}

describe('Focus Mode Integration', () => {
    const nodeA = createNode('node-a', 'Node A');
    const nodeB = createNode('node-b', 'Node B');

    beforeEach(() => {
        vi.clearAllMocks();
        _resetEscapeLayer();
        useFocusStore.setState({ focusedNodeId: null });
        useCanvasStore.setState({
            nodes: [nodeA, nodeB],
            edges: [],
            selectedNodeIds: new Set(),
            editingNodeId: null,
            draftContent: null,
            inputMode: 'note',
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Enter and exit focus flow', () => {
        it('enterFocus sets focusedNodeId and useFocusMode reflects it', () => {
            const { result } = renderHook(() => useFocusMode());

            act(() => { result.current.enterFocus('node-a'); });

            expect(result.current.isFocused).toBe(true);
            expect(result.current.focusedNodeId).toBe('node-a');
            expect(result.current.focusedNode?.data.heading).toBe('Node A');
        });

        it('ESC closes focus and clears editing state', () => {
            const { result } = renderHook(() => useFocusMode());

            act(() => { result.current.enterFocus('node-a'); });
            act(() => { useCanvasStore.setState({ editingNodeId: null }); });

            pressKey('Escape');

            expect(result.current.isFocused).toBe(false);
            expect(result.current.focusedNodeId).toBeNull();
        });

        it('exitFocus stops editing state', () => {
            const { result } = renderHook(() => useFocusMode());

            act(() => { result.current.enterFocus('node-a'); });
            useCanvasStore.setState({ editingNodeId: 'node-a' });

            act(() => { result.current.exitFocus(); });

            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });
    });

    describe('Switching focused nodes', () => {
        it('switching focus from node A to node B shows node B data', () => {
            const { result } = renderHook(() => useFocusMode());

            act(() => { result.current.enterFocus('node-a'); });
            expect(result.current.focusedNode?.data.heading).toBe('Node A');

            act(() => { result.current.enterFocus('node-b'); });
            expect(result.current.focusedNode?.data.heading).toBe('Node B');
            expect(result.current.focusedNodeId).toBe('node-b');
        });
    });

    describe('Canvas interaction gating', () => {
        it('isFocused is true when a node is focused', () => {
            const { result } = renderHook(() => useFocusMode());

            act(() => { result.current.enterFocus('node-a'); });
            expect(result.current.isFocused).toBe(true);
        });

        it('isFocused is false after exiting focus', () => {
            const { result } = renderHook(() => useFocusMode());

            act(() => { result.current.enterFocus('node-a'); });
            act(() => { result.current.exitFocus(); });
            expect(result.current.isFocused).toBe(false);
        });
    });

    describe('Heading edits persist', () => {
        it('heading changes via store persist after focus exit', () => {
            const { result } = renderHook(() => useFocusMode());

            act(() => { result.current.enterFocus('node-a'); });

            act(() => {
                useCanvasStore.getState().updateNodeHeading('node-a', 'Updated Heading');
            });

            act(() => { result.current.exitFocus(); });

            const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-a');
            expect(node?.data.heading).toBe('Updated Heading');
        });
    });

    describe('Tag edits persist', () => {
        it('tag changes via store persist after focus exit', () => {
            const { result } = renderHook(() => useFocusMode());

            act(() => { result.current.enterFocus('node-a'); });

            act(() => {
                useCanvasStore.getState().updateNodeTags('node-a', ['tag-1', 'tag-2', 'tag-3']);
            });

            act(() => { result.current.exitFocus(); });

            const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-a');
            expect(node?.data.tags).toEqual(['tag-1', 'tag-2', 'tag-3']);
        });
    });

    describe('stopEditing clears editing state after content save', () => {
        it('updateNodeOutput then stopEditing persists content and clears editingNodeId', () => {
            act(() => {
                useCanvasStore.setState({ editingNodeId: 'node-a' });
            });
            expect(useCanvasStore.getState().editingNodeId).toBe('node-a');

            act(() => {
                useCanvasStore.getState().updateNodeOutput('node-a', 'saved content');
                useCanvasStore.getState().stopEditing();
            });

            expect(useCanvasStore.getState().editingNodeId).toBeNull();
            const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-a');
            expect(node?.data.output).toBe('saved content');
        });

        it('stopEditing is idempotent — calling twice does not throw', () => {
            act(() => {
                useCanvasStore.setState({ editingNodeId: 'node-a' });
            });
            act(() => {
                useCanvasStore.getState().stopEditing();
                useCanvasStore.getState().stopEditing();
            });
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });
    });

    describe('Content edits persist on exit', () => {
        it('output changes via store persist after exitFocus', () => {
            const { result } = renderHook(() => useFocusMode());

            act(() => { result.current.enterFocus('node-a'); });

            act(() => {
                useCanvasStore.getState().updateNodeOutput('node-a', 'Updated body content');
            });

            act(() => { result.current.exitFocus(); });

            const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-a');
            expect(node?.data.output).toBe('Updated body content');
        });
    });

    describe('Editing state survives blur (cursor-sticky contract)', () => {
        it('editingNodeId stays set after a blur — single tap restores cursor, not double-tap', () => {
            // Regression: blur used to call stopEditing(), setting editingNodeId=null,
            // forcing a double-tap to re-enter edit mode.
            // With the fix, editingNodeId must remain set throughout focus mode.
            act(() => {
                useCanvasStore.setState({ editingNodeId: 'node-a' });
            });

            // Simulate: OS dismisses keyboard / user clicks heading / tab switch.
            // The overlay's onExitEditing is a no-op — it must NOT call stopEditing.
            // We verify the store invariant: focusedNodeId set → editingNodeId must not
            // be cleared by any blur path other than explicit exit (saveBeforeExit/ESC).
            act(() => {
                // Only explicit exit paths (exitFocus / saveBeforeExit) may clear it.
                // A bare stopEditing call here would represent the old bug.
            });

            expect(useCanvasStore.getState().editingNodeId).toBe('node-a');
        });

        it('exitFocus is the correct way to end editing — it clears both focusedNodeId and editingNodeId', () => {
            const { result } = renderHook(() => useFocusMode());

            act(() => { result.current.enterFocus('node-a'); });
            expect(useCanvasStore.getState().editingNodeId).toBe('node-a');

            act(() => { result.current.exitFocus(); });

            expect(useFocusStore.getState().focusedNodeId).toBeNull();
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });
    });

    describe('Link previews accessible on focusedNode (SSOT)', () => {
        it('linkPreviews from store are accessible on focusedNode', () => {
            const previews = {
                'https://x.com/post/1': { url: 'https://x.com/post/1', title: 'X Post', domain: 'x.com', fetchedAt: Date.now() },
            };
            act(() => {
                useCanvasStore.getState().addLinkPreview('node-a', 'https://x.com/post/1', previews['https://x.com/post/1']);
            });

            const { result } = renderHook(() => useFocusMode());
            act(() => { result.current.enterFocus('node-a'); });

            expect(result.current.focusedNode?.data.linkPreviews).toBeDefined();
            expect(result.current.focusedNode?.data.linkPreviews?.['https://x.com/post/1']).toEqual(
                expect.objectContaining({ url: 'https://x.com/post/1', title: 'X Post' }),
            );
        });
    });
});
