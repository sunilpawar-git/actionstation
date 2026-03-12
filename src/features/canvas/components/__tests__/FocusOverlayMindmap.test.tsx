/**
 * Phase A — FocusOverlay Mindmap Tests
 *
 * Validates that FocusOverlay correctly renders MindmapRenderer
 * when the focused node has contentMode === 'mindmap', and shows
 * TipTapEditor when editing or in text mode.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { FocusOverlay } from '../FocusOverlay';
import { useFocusStore } from '../../stores/focusStore';
import { useCanvasStore } from '../../stores/canvasStore';
import type { CanvasNode } from '../../types/node';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockGetMarkdown = vi.fn(() => 'edited content');

vi.mock('../../hooks/useIdeaCardEditor', () => ({
    useIdeaCardEditor: () => ({
        editor: null,
        getMarkdown: mockGetMarkdown,
        setContent: vi.fn(),
        submitHandlerRef: { current: null },
    }),
}));

vi.mock('../../hooks/useTipTapEditor', () => ({
    useTipTapEditor: () => ({
        editor: null,
        getMarkdown: vi.fn(() => ''),
        setContent: vi.fn(),
    }),
}));

vi.mock('../nodes/NodeHeading', async () => {
    const React = await import('react');
    return {
        NodeHeading: React.forwardRef(
            (
                { heading }: { heading: string },
                ref: React.ForwardedRef<{ focus: () => void; getHeading: () => string }>,
            ) => {
                React.useImperativeHandle(ref, () => ({ focus: () => {}, getHeading: () => heading }));
                return React.createElement('div', { 'data-testid': 'focus-heading' }, heading);
            },
        ),
    };
});

vi.mock('../nodes/TipTapEditor', async () => {
    const React = await import('react');
    return {
        TipTapEditor: ({ 'data-testid': testId }: { 'data-testid'?: string }) =>
            React.createElement('div', { 'data-testid': testId ?? 'tiptap-editor' }),
    };
});

vi.mock('../nodes/MindmapRenderer', async () => {
    const React = await import('react');
    return {
        MindmapRenderer: ({ markdown }: { markdown: string }) =>
            React.createElement('div', { 'data-testid': 'mindmap-renderer' }, `Mindmap:${markdown}`),
    };
});

vi.mock('@/features/tags', async () => {
    const React = await import('react');
    return {
        TagInput: ({ selectedTagIds }: { selectedTagIds: string[] }) =>
            React.createElement('div', { 'data-testid': 'focus-tags' }, selectedTagIds.join(',')),
    };
});

vi.mock('../nodes/LinkPreviewCard', async () => {
    const React = await import('react');
    return {
        LinkPreviewList: () => React.createElement('div', { 'data-testid': 'link-preview-list' }),
    };
});

vi.mock('../../hooks/useHeadingEditor', () => ({
    useHeadingEditor: () => ({
        editor: null,
        suggestionActiveRef: { current: false },
    }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────

const textNode: CanvasNode = {
    id: 'text-node',
    workspaceId: 'ws-1',
    type: 'idea',
    data: {
        heading: 'Text Node',
        output: 'Some text content',
        isGenerating: false,
        isPromptCollapsed: false,
        contentMode: 'text',
    },
    position: { x: 0, y: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mindmapNode: CanvasNode = {
    id: 'mindmap-node',
    workspaceId: 'ws-1',
    type: 'idea',
    data: {
        heading: 'Mindmap Node',
        output: '# Topic\n- Branch A\n- Branch B',
        isGenerating: false,
        isPromptCollapsed: false,
        contentMode: 'mindmap',
    },
    position: { x: 0, y: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
};

const legacyNode: CanvasNode = {
    id: 'legacy-node',
    workspaceId: 'ws-1',
    type: 'idea',
    data: {
        heading: 'Legacy Node',
        output: 'Plain text',
        isGenerating: false,
        isPromptCollapsed: false,
        // no contentMode — backward compat
    },
    position: { x: 0, y: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
};

function setUpStore(nodes: CanvasNode[]) {
    useCanvasStore.setState({
        nodes,
        edges: [],
        selectedNodeIds: new Set(),
        editingNodeId: null,
        draftContent: null,
        inputMode: 'note',
    });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('FocusOverlay — mindmap rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useFocusStore.setState({ focusedNodeId: null });
        setUpStore([textNode, mindmapNode, legacyNode]);
    });

    it('renders TipTapEditor for text-mode node (not mindmap)', () => {
        useFocusStore.setState({ focusedNodeId: 'text-node' });
        render(<FocusOverlay />);
        expect(screen.getByTestId('focus-editor')).toBeInTheDocument();
        expect(screen.queryByTestId('mindmap-renderer')).not.toBeInTheDocument();
    });

    it('renders MindmapRenderer for mindmap-mode node (not editing)', async () => {
        useFocusStore.setState({ focusedNodeId: 'mindmap-node' });
        await act(async () => {
            render(<FocusOverlay />);
        });
        expect(screen.getByTestId('mindmap-renderer')).toBeInTheDocument();
        expect(screen.getByTestId('mindmap-renderer').textContent).toContain('Mindmap:');
        expect(screen.getByTestId('mindmap-renderer').textContent).toContain('Topic');
    });

    it('hides TipTapEditor when mindmap mode is active and not editing', async () => {
        useFocusStore.setState({ focusedNodeId: 'mindmap-node' });
        await act(async () => {
            render(<FocusOverlay />);
        });
        // TipTap wrapper should have display:none
        const contentArea = screen.getByTestId('focus-content-area');
        const hiddenWrapper = contentArea.querySelector('[style*="display: none"]');
        expect(hiddenWrapper).toBeInTheDocument();
    });

    it('shows TipTapEditor when mindmap node is in editing mode', () => {
        useFocusStore.setState({ focusedNodeId: 'mindmap-node' });
        useCanvasStore.setState({ editingNodeId: 'mindmap-node' });
        render(<FocusOverlay />);
        expect(screen.getByTestId('focus-editor')).toBeInTheDocument();
        // Mindmap should not render during editing
        expect(screen.queryByTestId('mindmap-renderer')).not.toBeInTheDocument();
    });

    it('renders TipTapEditor for legacy node without contentMode', () => {
        useFocusStore.setState({ focusedNodeId: 'legacy-node' });
        render(<FocusOverlay />);
        expect(screen.getByTestId('focus-editor')).toBeInTheDocument();
        expect(screen.queryByTestId('mindmap-renderer')).not.toBeInTheDocument();
    });

    it('passes output markdown to MindmapRenderer', async () => {
        useFocusStore.setState({ focusedNodeId: 'mindmap-node' });
        await act(async () => {
            render(<FocusOverlay />);
        });
        const content = screen.getByTestId('mindmap-renderer').textContent ?? '';
        expect(content).toContain('Topic');
        expect(content).toContain('Branch A');
        expect(content).toContain('Branch B');
    });

    it('renders empty state when output is undefined', async () => {
        const noOutputMindmap: CanvasNode = {
            ...mindmapNode,
            id: 'no-output-mindmap',
            data: { ...mindmapNode.data, output: undefined },
        };
        setUpStore([noOutputMindmap]);
        useFocusStore.setState({ focusedNodeId: 'no-output-mindmap' });
        await act(async () => {
            render(<FocusOverlay />);
        });
        expect(screen.queryByTestId('mindmap-renderer')).not.toBeInTheDocument();
        expect(screen.getByTestId('mindmap-empty-state')).toBeInTheDocument();
    });
});
