/**
 * IdeaCard Cmd/Ctrl+Click → Focus Mode Tests — TDD
 *
 * Cmd+Click (macOS) / Ctrl+Click (Windows/Linux) on any node immediately
 * enters focus mode for that node, without requiring a double-click.
 *
 * Contracts verified:
 *  1. metaKey click  → focusedNodeId set
 *  2. ctrlKey click  → focusedNodeId set
 *  3. plain click    → focusedNodeId unchanged (no accidental focus)
 *  4. editingNodeId set for text nodes (enterFocusWithEditing contract)
 *  5. switching focus from another node
 *  6. mindmap node: focus entered, editing NOT started
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import { useFocusStore } from '../../../stores/focusStore';
import { createIdeaNode } from '../../../types/node';
import { defaultTestData, defaultTestProps } from './helpers/ideaCardTestMocks';

// ── ReactFlow ─────────────────────────────────────────────────────────────────
vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        Handle: ({ type, position }: { type: string; position: string }) => (
            <div data-testid={`handle-${type}-${position}`} />
        ),
        Position: { Top: 'top', Bottom: 'bottom' },
        NodeResizer: () => <div data-testid="node-resizer" />,
    };
});

// ── AI generation ─────────────────────────────────────────────────────────────
vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({ generateFromPrompt: vi.fn(), branchFromNode: vi.fn() }),
}));

// ── IdeaCard sub-hooks (same scaffold as doubleclick tests) ───────────────────
vi.mock('../../../hooks/useIdeaCardActions', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardActionsMock()
);
vi.mock('../../../hooks/useIdeaCardState', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardStateMock()
);
vi.mock('../NodeHeading', () => ({
    NodeHeading: ({ heading, onDoubleClick }: { heading: string; onDoubleClick?: () => void }) => (
        <div data-testid="node-heading" onDoubleClick={onDoubleClick}>{heading}</div>
    ),
}));
vi.mock('../NodeDivider', () => ({
    NodeDivider: () => <div data-testid="node-divider" />,
}));
vi.mock('../../../hooks/useTipTapEditor', async () =>
    (await import('./helpers/tipTapTestMock')).hookMock()
);
vi.mock('../TipTapEditor', async () =>
    (await import('./helpers/tipTapTestMock')).componentMock()
);
vi.mock('../../../extensions/slashCommandSuggestion', async () =>
    (await import('./helpers/tipTapTestMock')).extensionMock()
);
vi.mock('../../../hooks/useIdeaCardEditor', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardEditorMock()
);
vi.mock('../../../hooks/useNodeInput', async () =>
    (await import('./helpers/tipTapTestMock')).useNodeInputMock()
);
vi.mock('../../../hooks/useLinkPreviewFetch', () => ({
    useLinkPreviewFetch: vi.fn(),
}));
vi.mock('@/features/canvas/contexts/PanToNodeContext', () => ({
    usePanToNodeContext: () => ({ panToPosition: vi.fn() }),
}));

// ── helpers ───────────────────────────────────────────────────────────────────
const NODE_ID = defaultTestProps.id; // 'idea-1'

function seedStore(contentMode?: 'mindmap'): void {
    const node = createIdeaNode(NODE_ID, 'ws-1', { x: 0, y: 0 });
    if (contentMode === 'mindmap') {
        node.data.contentMode = contentMode;
        node.data.output = '# Topic\n- A';
    }
    useCanvasStore.setState({
        nodes: [node],
        edges: [],
        selectedNodeIds: new Set(),
        editingNodeId: null,
        draftContent: null,
        inputMode: 'note',
    });
    useFocusStore.setState({ focusedNodeId: null });
}

// ── suite ─────────────────────────────────────────────────────────────────────
describe('IdeaCard — Cmd/Ctrl+Click → Focus Mode', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const { resetMockState, initNodeInputStore, initStateStore } =
            await import('./helpers/tipTapTestMock');
        resetMockState();
        initNodeInputStore(useCanvasStore);
        initStateStore(useCanvasStore);
        seedStore();
    });

    it('Cmd+click (metaKey) enters focus mode for the node', () => {
        render(<IdeaCard {...defaultTestProps} />);
        fireEvent.click(screen.getByTestId('idea-card-wrapper'), { metaKey: true });
        expect(useFocusStore.getState().focusedNodeId).toBe(NODE_ID);
    });

    it('Ctrl+click (ctrlKey) enters focus mode for the node', () => {
        render(<IdeaCard {...defaultTestProps} />);
        fireEvent.click(screen.getByTestId('idea-card-wrapper'), { ctrlKey: true });
        expect(useFocusStore.getState().focusedNodeId).toBe(NODE_ID);
    });

    it('plain click (no modifier) does NOT enter focus mode', () => {
        render(<IdeaCard {...defaultTestProps} />);
        fireEvent.click(screen.getByTestId('idea-card-wrapper'));
        expect(useFocusStore.getState().focusedNodeId).toBeNull();
    });

    it('Shift+click (selection modifier) does NOT enter focus mode', () => {
        render(<IdeaCard {...defaultTestProps} />);
        fireEvent.click(screen.getByTestId('idea-card-wrapper'), { shiftKey: true });
        expect(useFocusStore.getState().focusedNodeId).toBeNull();
    });

    it('sets editingNodeId for text nodes (enterFocusWithEditing contract)', () => {
        render(<IdeaCard {...defaultTestProps} />);
        fireEvent.click(screen.getByTestId('idea-card-wrapper'), { metaKey: true });
        expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
    });

    it('Cmd+click when another node is focused switches focus to clicked node', () => {
        useFocusStore.setState({ focusedNodeId: 'other-node' });
        render(<IdeaCard {...defaultTestProps} />);
        fireEvent.click(screen.getByTestId('idea-card-wrapper'), { metaKey: true });
        expect(useFocusStore.getState().focusedNodeId).toBe(NODE_ID);
    });

    it('Cmd+click on a mindmap node enters focus but does not set editingNodeId', () => {
        seedStore('mindmap');
        const mindmapProps = {
            ...defaultTestProps,
            data: { ...defaultTestData, contentMode: 'mindmap' as const, output: '# Topic\n- A' },
        };
        render(<IdeaCard {...mindmapProps} />);
        fireEvent.click(screen.getByTestId('idea-card-wrapper'), { metaKey: true });
        expect(useFocusStore.getState().focusedNodeId).toBe(NODE_ID);
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
    });

    /**
     * ReactFlow non-interference contract
     *
     * stopPropagation on the click event would prevent ReactFlow's internal
     * NodeWrapper from receiving it, so onSelectionChange never fires and
     * selectedNodeIds in canvasStore stays stale (the previously-selected node
     * remains "selected" even though focus mode opened on a different node).
     *
     * These tests are regression guards — re-introducing stopPropagation()
     * would immediately fail this suite.
     */
    describe('ReactFlow non-interference — stopPropagation must NOT be called', () => {
        it('Cmd+click does not call stopPropagation (ReactFlow onSelectionChange must fire)', () => {
            render(<IdeaCard {...defaultTestProps} />);
            const wrapper = screen.getByTestId('idea-card-wrapper');
            const event = new MouseEvent('click', { bubbles: true, metaKey: true });
            const stopSpy = vi.spyOn(event, 'stopPropagation');
            act(() => { wrapper.dispatchEvent(event); });
            expect(stopSpy).not.toHaveBeenCalled();
        });

        it('plain click does not call stopPropagation', () => {
            render(<IdeaCard {...defaultTestProps} />);
            const wrapper = screen.getByTestId('idea-card-wrapper');
            const event = new MouseEvent('click', { bubbles: true });
            const stopSpy = vi.spyOn(event, 'stopPropagation');
            wrapper.dispatchEvent(event);
            expect(stopSpy).not.toHaveBeenCalled();
        });
    });
});
