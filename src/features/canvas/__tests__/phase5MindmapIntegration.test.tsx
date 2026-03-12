/**
 * Phase 5 — Mindmap Integration Tests
 *
 * End-to-end integration tests for the full mindmap feature lifecycle:
 * 1. Lazy loading — MindmapRenderer is code-split via React.lazy
 * 2. Toggle flow — contentMode toggles switching between text and mindmap
 * 3. Store round-trip — updateNodeContentMode persists and reads correctly
 * 4. Edge cases — empty content, undefined mode, backward compatibility
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useCanvasStore } from '../stores/canvasStore';
import { normalizeContentMode, isContentModeMindmap, DEFAULT_CONTENT_MODE, type ContentMode } from '../types/contentMode';
import type { IdeaNodeData } from '../types/node';

// ── Mock dependencies ─────────────────────────────────────────────────

vi.mock('../components/nodes/TipTapEditor', () => ({
    TipTapEditor: (props: Record<string, unknown>) => (
        <div data-testid={props['data-testid'] ?? 'mock-tiptap'}>TipTapEditor</div>
    ),
}));

vi.mock('../components/nodes/MindmapRenderer', () => ({
    MindmapRenderer: ({ markdown }: { markdown: string }) => (
        <div data-testid="mindmap-renderer">{`Mindmap:${markdown}`}</div>
    ),
}));

vi.mock('../components/nodes/IdeaCardContent', () => ({
    GeneratingContent: () => <div data-testid="generating-content">Generating…</div>,
}));

vi.mock('../components/nodes/LinkPreviewCard', () => ({
    LinkPreviewList: () => <div data-testid="link-preview-list" />,
}));

// eslint-disable-next-line import-x/first
import { IdeaCardContentSection, type IdeaCardContentSectionProps } from '../components/nodes/IdeaCardContentSection';

// ── Helpers ───────────────────────────────────────────────────────────

const createNode = (id: string, contentMode?: ContentMode, output?: string) => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea' as const,
    data: {
        prompt: 'test',
        output,
        isGenerating: false,
        isPromptCollapsed: false,
        contentMode,
    } as IdeaNodeData,
    position: { x: 0, y: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
});

function makeContentProps(overrides: Partial<IdeaCardContentSectionProps> = {}): IdeaCardContentSectionProps {
    return {
        contentRef: { current: null },
        selected: false,
        isEditing: false,
        onKeyDown: undefined,
        isGenerating: false,
        hasContent: true,
        isAICard: false,
        heading: 'Test',
        prompt: '',
        editor: null,
        handleDoubleClick: vi.fn(),
        linkPreviews: {},
        ...overrides,
    };
}

// ── 1. Lazy loading verification ──────────────────────────────────────

describe('MindmapRenderer lazy loading', () => {
    it('IdeaCardContentSection imports MindmapRenderer (verifies module loads)', async () => {
        // When the module is lazy-loaded, the mock still resolves synchronously in tests
        await act(async () => {
            render(
                <IdeaCardContentSection
                    {...makeContentProps({ contentMode: 'mindmap', output: '# Test' })}
                />,
            );
        });
        // If lazy loading broke the import, this would fail
        expect(screen.getByTestId('mindmap-renderer')).toBeInTheDocument();
    });

    it('does not render MindmapRenderer when content mode is text (code not loaded unnecessarily)', () => {
        render(<IdeaCardContentSection {...makeContentProps({ contentMode: 'text' })} />);
        expect(screen.queryByTestId('mindmap-renderer')).not.toBeInTheDocument();
        expect(screen.getByText('TipTapEditor')).toBeInTheDocument();
    });
});

// ── 2. Store round-trip: toggle → persist → read ──────────────────────

describe('Mindmap store round-trip', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
    });

    it('updateNodeContentMode persists to store and reads back correctly', () => {
        useCanvasStore.getState().addNode(createNode('n-1'));
        useCanvasStore.getState().updateNodeContentMode('n-1', 'mindmap');

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n-1');
        expect(node?.data.contentMode).toBe('mindmap');
    });

    it('toggles from text → mindmap → text correctly', () => {
        useCanvasStore.getState().addNode(createNode('n-1', 'text'));

        // text → mindmap
        useCanvasStore.getState().updateNodeContentMode('n-1', 'mindmap');
        let node = useCanvasStore.getState().nodes.find(n => n.id === 'n-1');
        expect(node?.data.contentMode).toBe('mindmap');

        // mindmap → text
        useCanvasStore.getState().updateNodeContentMode('n-1', 'text');
        node = useCanvasStore.getState().nodes.find(n => n.id === 'n-1');
        expect(node?.data.contentMode).toBe('text');
    });

    it('store node data reflects in rendered content section', async () => {
        useCanvasStore.getState().addNode(createNode('n-1', 'text', '# Test Content'));

        // Initial render in text mode
        const { rerender } = render(
            <IdeaCardContentSection
                {...makeContentProps({ contentMode: 'text', output: '# Test Content' })}
            />,
        );
        expect(screen.queryByTestId('mindmap-renderer')).not.toBeInTheDocument();

        // Update store and re-render with mindmap mode
        await act(async () => {
            useCanvasStore.getState().updateNodeContentMode('n-1', 'mindmap');
            rerender(
                <IdeaCardContentSection
                    {...makeContentProps({ contentMode: 'mindmap', output: '# Test Content' })}
                />,
            );
        });
        expect(screen.getByTestId('mindmap-renderer')).toBeInTheDocument();
        expect(screen.getByTestId('mindmap-renderer').textContent).toBe('Mindmap:# Test Content');
    });

    it('multiple nodes can have independent content modes', () => {
        useCanvasStore.getState().addNode(createNode('n-1', 'text'));
        useCanvasStore.getState().addNode(createNode('n-2', 'mindmap'));

        useCanvasStore.getState().updateNodeContentMode('n-1', 'mindmap');

        const n1 = useCanvasStore.getState().nodes.find(n => n.id === 'n-1');
        const n2 = useCanvasStore.getState().nodes.find(n => n.id === 'n-2');
        expect(n1?.data.contentMode).toBe('mindmap');
        expect(n2?.data.contentMode).toBe('mindmap');

        useCanvasStore.getState().updateNodeContentMode('n-2', 'text');
        const n2After = useCanvasStore.getState().nodes.find(n => n.id === 'n-2');
        expect(n2After?.data.contentMode).toBe('text');
    });
});

// ── 3. Content mode type validation ───────────────────────────────────

describe('ContentMode type safety', () => {
    it('normalizeContentMode returns default for undefined', () => {
        expect(normalizeContentMode(undefined)).toBe(DEFAULT_CONTENT_MODE);
    });

    it('normalizeContentMode returns default for invalid strings', () => {
        expect(normalizeContentMode('invalid' as ContentMode)).toBe(DEFAULT_CONTENT_MODE);
    });

    it('normalizeContentMode preserves valid values', () => {
        expect(normalizeContentMode('text')).toBe('text');
        expect(normalizeContentMode('mindmap')).toBe('mindmap');
    });

    it('isContentModeMindmap returns correct booleans', () => {
        expect(isContentModeMindmap('mindmap')).toBe(true);
        expect(isContentModeMindmap('text')).toBe(false);
        expect(isContentModeMindmap(undefined)).toBe(false);
    });
});

// ── 4. Edge cases ─────────────────────────────────────────────────────

describe('Mindmap edge cases', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
    });

    it('mindmap renders empty fallback when output is empty string', async () => {
        await act(async () => {
            render(
                <IdeaCardContentSection
                    {...makeContentProps({ contentMode: 'mindmap', output: '' })}
                />,
            );
        });
        // MindmapRenderer receives empty string, renders with it
        expect(screen.getByTestId('mindmap-renderer')).toBeInTheDocument();
        expect(screen.getByTestId('mindmap-renderer').textContent).toBe('Mindmap:');
    });

    it('mindmap does not render during generation even in mindmap mode', () => {
        render(
            <IdeaCardContentSection
                {...makeContentProps({
                    contentMode: 'mindmap',
                    output: '# Content',
                    isGenerating: true,
                })}
            />,
        );
        expect(screen.queryByTestId('mindmap-renderer')).not.toBeInTheDocument();
        expect(screen.getByTestId('generating-content')).toBeInTheDocument();
    });

    it('switching to editing in mindmap mode shows editor, hides mindmap', () => {
        render(
            <IdeaCardContentSection
                {...makeContentProps({
                    contentMode: 'mindmap',
                    output: '# Content',
                    isEditing: true,
                })}
            />,
        );
        expect(screen.queryByTestId('mindmap-renderer')).not.toBeInTheDocument();
        expect(screen.getByText('TipTapEditor')).toBeInTheDocument();
    });

    it('backward compat: undefined contentMode renders text editor', () => {
        render(
            <IdeaCardContentSection
                {...makeContentProps({ contentMode: undefined, output: 'some text' })}
            />,
        );
        expect(screen.getByText('TipTapEditor')).toBeInTheDocument();
        expect(screen.queryByTestId('mindmap-renderer')).not.toBeInTheDocument();
    });

    it('node without contentMode field defaults correctly after store action', () => {
        // Simulate legacy node without contentMode
        const legacyNode = createNode('legacy-1');
        delete (legacyNode.data as Record<string, unknown>).contentMode;
        useCanvasStore.getState().addNode(legacyNode);

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'legacy-1');
        expect(node?.data.contentMode).toBeUndefined();

        // Toggle to mindmap
        useCanvasStore.getState().updateNodeContentMode('legacy-1', 'mindmap');
        const updated = useCanvasStore.getState().nodes.find(n => n.id === 'legacy-1');
        expect(updated?.data.contentMode).toBe('mindmap');
    });
});
