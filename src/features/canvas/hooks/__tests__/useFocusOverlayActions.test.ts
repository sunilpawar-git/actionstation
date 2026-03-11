/**
 * useFocusOverlayActions Tests
 *
 * Regression guard for the "sticky editing" contract in focus mode:
 *   A TipTap blur (OS keyboard dismissal, tab switch, heading click, etc.)
 *   must NOT call stopEditing(). The cursor must survive a blur and be
 *   recoverable with a single tap — not a double-tap.
 *
 * Only the explicit exit paths (saveBeforeExit, ESC key) may call stopEditing.
 *
 * Root cause of the original bug:
 *   onExitEditing: useCallback(() => { useCanvasStore.getState().stopEditing(); }, [])
 *   ↑ Any blur → stopEditing() → isEditing=false → setEditable(false) → cursor gone
 *
 * Fix: onExitEditing is a no-op in focus mode. stopEditing only via saveBeforeExit.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import type { CanvasNode } from '../../types/node';

// ---------------------------------------------------------------------------
// Mock useIdeaCardEditor
// Captures onExitEditing and saveContent so tests can invoke blur directly.
// simulateBlur replicates the handleBlur sequence: saveContent → onExitEditing.
// ---------------------------------------------------------------------------
let capturedOnExitEditing: (() => void) | undefined;
let capturedSubmitHandlerRef: { current: unknown } | undefined;
let simulateBlur: ((md: string) => void) | undefined;

vi.mock('../useIdeaCardEditor', () => ({
    useIdeaCardEditor: (opts: {
        isEditing: boolean;
        output?: string;
        getEditableContent: () => string;
        placeholder: string;
        saveContent: (md: string) => void;
        onExitEditing: () => void;
    }) => {
        capturedOnExitEditing = opts.onExitEditing;
        simulateBlur = (md: string) => {
            opts.saveContent(md);
            opts.onExitEditing();
        };
        const submitHandlerRef = { current: null };
        capturedSubmitHandlerRef = submitHandlerRef;
        return {
            editor: null,
            getMarkdown: () => opts.isEditing ? opts.getEditableContent() : (opts.output ?? ''),
            setContent: vi.fn(),
            submitHandlerRef,
        };
    },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const NODE_ID = 'focus-node-1';
const INITIAL_OUTPUT = 'Hello world';

const mockNode: CanvasNode = {
    id: NODE_ID,
    workspaceId: 'ws-1',
    type: 'idea',
    position: { x: 0, y: 0 },
    data: {
        heading: 'Test Node',
        prompt: 'Test Node',
        output: INITIAL_OUTPUT,
        isGenerating: false,
        isPromptCollapsed: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
};

function setupStore(editingNodeId: string | null = NODE_ID) {
    useCanvasStore.setState({
        nodes: [mockNode],
        edges: [],
        selectedNodeIds: new Set(),
        editingNodeId,
        draftContent: null,
        inputMode: 'note',
    });
}

// ---------------------------------------------------------------------------
// Behavioural tests — editing lifecycle
// ---------------------------------------------------------------------------
describe('useFocusOverlayActions — editing lifecycle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedOnExitEditing = undefined;
        simulateBlur = undefined;
        setupStore();
    });

    it('[REGRESSION] blur does NOT clear editingNodeId while in focus mode', async () => {
        const { useFocusOverlayActions } = await import('../useFocusOverlayActions');

        renderHook(() =>
            useFocusOverlayActions({ nodeId: NODE_ID, output: INITIAL_OUTPUT, isEditing: true, onExit: vi.fn() }),
        );

        // Simulate: OS dismisses keyboard / user clicks heading / tab switch
        act(() => { simulateBlur?.('updated content'); });

        // editingNodeId must remain set → single tap restores cursor, not double-tap
        expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
    });

    it('onExitEditing is a no-op — calling it directly does not touch the store', async () => {
        const { useFocusOverlayActions } = await import('../useFocusOverlayActions');

        renderHook(() =>
            useFocusOverlayActions({ nodeId: NODE_ID, output: INITIAL_OUTPUT, isEditing: true, onExit: vi.fn() }),
        );

        expect(capturedOnExitEditing).toBeDefined();

        act(() => { capturedOnExitEditing!(); });

        // stopEditing was NOT called — editingNodeId unchanged
        expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
    });

    it('blur saves content to the node in the store', async () => {
        const { useFocusOverlayActions } = await import('../useFocusOverlayActions');

        renderHook(() =>
            useFocusOverlayActions({ nodeId: NODE_ID, output: INITIAL_OUTPUT, isEditing: true, onExit: vi.fn() }),
        );

        act(() => { simulateBlur?.('saved on blur'); });

        const node = useCanvasStore.getState().nodes.find(n => n.id === NODE_ID);
        expect(node?.data.output).toBe('saved on blur');
    });

    it('saveBeforeExit saves content AND clears editingNodeId', async () => {
        const { useFocusOverlayActions } = await import('../useFocusOverlayActions');

        const { result } = renderHook(() =>
            useFocusOverlayActions({ nodeId: NODE_ID, output: INITIAL_OUTPUT, isEditing: true, onExit: vi.fn() }),
        );

        act(() => { result.current.saveBeforeExit(); });

        expect(useCanvasStore.getState().editingNodeId).toBeNull();
    });

    it('ESC key invokes saveBeforeExit and calls onExit', async () => {
        const { useFocusOverlayActions } = await import('../useFocusOverlayActions');
        const onExit = vi.fn();

        renderHook(() =>
            useFocusOverlayActions({ nodeId: NODE_ID, output: INITIAL_OUTPUT, isEditing: true, onExit }),
        );

        const handler = capturedSubmitHandlerRef?.current as { onEscape: () => boolean } | null;
        expect(handler).not.toBeNull();

        act(() => { handler!.onEscape(); });

        expect(useCanvasStore.getState().editingNodeId).toBeNull();
        expect(onExit).toHaveBeenCalledOnce();
    });

    it('saveBeforeExit flushes pending heading change via getHeading callback', async () => {
        const { useFocusOverlayActions } = await import('../useFocusOverlayActions');
        const getHeading = vi.fn(() => 'Updated Heading');

        const { result } = renderHook(() =>
            useFocusOverlayActions({ nodeId: NODE_ID, output: INITIAL_OUTPUT, isEditing: true, onExit: vi.fn(), getHeading }),
        );

        act(() => { result.current.saveBeforeExit(); });

        const node = useCanvasStore.getState().nodes.find(n => n.id === NODE_ID);
        expect(node?.data.heading).toBe('Updated Heading');
        expect(getHeading).toHaveBeenCalledOnce();
    });

    it('handleDoubleClick calls startEditing to re-enter editing after a blur', async () => {
        const { useFocusOverlayActions } = await import('../useFocusOverlayActions');

        // Simulate state after the old bug: blur killed editingNodeId
        setupStore(null);

        const { result } = renderHook(() =>
            useFocusOverlayActions({ nodeId: NODE_ID, output: INITIAL_OUTPUT, isEditing: false, onExit: vi.fn() }),
        );

        act(() => { result.current.handleDoubleClick(); });

        expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
    });
});

// ---------------------------------------------------------------------------
// Structural tests — enforce the contract at the source level
// ---------------------------------------------------------------------------
describe('useFocusOverlayActions — structural contract', () => {
    const SRC = readFileSync(
        join(process.cwd(), 'src/features/canvas/hooks/useFocusOverlayActions.ts'),
        'utf-8',
    );
    const IDEA_CARD_SRC = readFileSync(
        join(process.cwd(), 'src/features/canvas/hooks/useIdeaCard.ts'),
        'utf-8',
    );

    it('onExitEditing callback must NOT call stopEditing (blur must not kill the cursor)', () => {
        // The old anti-pattern that caused the bug:
        //   onExitEditing: useCallback(() => { useCanvasStore.getState().stopEditing(); }, [])
        const antiPattern = /onExitEditing:\s*useCallback\(\s*\(\)\s*=>\s*\{[^}]*stopEditing/;
        expect(antiPattern.test(SRC)).toBe(false);
    });

    it('saveBeforeExit must call stopEditing (the correct exit path must clean up)', () => {
        // Verify stopEditing still exists in the file — used by saveBeforeExit
        expect(SRC).toContain('stopEditing');
        // And saveBeforeExit itself is defined
        expect(SRC).toContain('saveBeforeExit');
    });

    it('saveBeforeExit must flush heading via getHeading callback', () => {
        // saveBeforeExit must call handleHeadingChange(getHeading()) to persist
        // heading edits that have NOT yet been committed via blur in the heading editor.
        expect(SRC).toContain('getHeading');
        expect(SRC).toMatch(/handleHeadingChange\(getHeading\(\)/);
    });

    it('useIdeaCard onExitEditing must guard against stopEditing while focused', () => {
        // useIdeaCard has a parallel editor for the canvas node.
        // Its onExitEditing must bail out when a focusedNodeId is set,
        // preventing the IdeaCard blur from also killing the editing session.
        expect(IDEA_CARD_SRC).toMatch(/if.*focusedNodeId.*return/);
    });
});
