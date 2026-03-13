/**
 * Smart Mindmap Toggle — TDD (RED phase)
 *
 * Validates the consolidated "one smart button" behaviour:
 * 1. looksLikeMindmapMarkdown — detects already-structured markdown
 * 2. toggleContentModeWithUndo (text→mindmap) — instant if structured, AI if prose
 * 3. toggleContentModeWithUndo (mindmap→text) — always instant
 * 4. No separate convertToMindmapWithAI export is required by callers
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCanvasStore } from '../../stores/canvasStore';
import { useHistoryStore } from '../../stores/historyStore';
import { createIdeaNode } from '../../types/node';

// ── Mock AI conversion so tests are deterministic ────────────────────
const mockConvertTextToMindmap = vi.fn();
vi.mock('@/features/ai/services/geminiService', () => ({
    convertTextToMindmap: mockConvertTextToMindmap,
}));

// ── Mock toast to avoid DOM side-effects ─────────────────────────────
vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/shared/services/sentryService', () => ({
    captureError: vi.fn(),
}));

const WS = 'ws-1';

function addNode(id: string, output: string, contentMode?: 'text' | 'mindmap') {
    const node = createIdeaNode(id, WS, { x: 0, y: 0 });
    node.data.output = output;
    node.data.contentMode = contentMode;
    useCanvasStore.getState().addNode(node);
}

// ── 1. looksLikeMindmapMarkdown helper ───────────────────────────────

describe('looksLikeMindmapMarkdown', () => {
    it('returns true for text with # root and ## branches', async () => {
        const { looksLikeMindmapMarkdown } = await import('../contentModeToggleService');
        expect(looksLikeMindmapMarkdown('# Topic\n## Branch A\n## Branch B')).toBe(true);
    });

    it('returns true for deeply nested markdown', async () => {
        const { looksLikeMindmapMarkdown } = await import('../contentModeToggleService');
        expect(looksLikeMindmapMarkdown('# Root\n## Child\n### Grandchild')).toBe(true);
    });

    it('returns false for plain prose with no headings', async () => {
        const { looksLikeMindmapMarkdown } = await import('../contentModeToggleService');
        expect(looksLikeMindmapMarkdown('This is a paragraph of prose text.')).toBe(false);
    });

    it('returns false for text with only a single # heading and no ##', async () => {
        const { looksLikeMindmapMarkdown } = await import('../contentModeToggleService');
        expect(looksLikeMindmapMarkdown('# Topic\nSome prose under it.')).toBe(false);
    });

    it('returns false for empty string', async () => {
        const { looksLikeMindmapMarkdown } = await import('../contentModeToggleService');
        expect(looksLikeMindmapMarkdown('')).toBe(false);
    });

    it('returns false for bullet-only lists with no headings', async () => {
        const { looksLikeMindmapMarkdown } = await import('../contentModeToggleService');
        expect(looksLikeMindmapMarkdown('- item one\n- item two\n- item three')).toBe(false);
    });
});

// ── 2. Smart toggle: prose node triggers AI conversion ────────────────

describe('toggleContentModeWithUndo — prose node → triggers AI', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
        useHistoryStore.setState({ undoStack: [], redoStack: [] });
        vi.clearAllMocks();
    });

    it('calls convertTextToMindmap when content is prose (not structured markdown)', async () => {
        const { toggleContentModeWithUndo } = await import('../contentModeToggleService');
        mockConvertTextToMindmap.mockResolvedValue('# Title\n## Section A\n## Section B');
        addNode('n1', 'This is plain prose text without any structure.', 'text');

        await toggleContentModeWithUndo('n1');

        expect(mockConvertTextToMindmap).toHaveBeenCalledTimes(1);
        expect(mockConvertTextToMindmap).toHaveBeenCalledWith('This is plain prose text without any structure.');
    });

    it('sets contentMode to mindmap and replaces output after AI conversion', async () => {
        const { toggleContentModeWithUndo } = await import('../contentModeToggleService');
        const converted = '# Topic\n## Branch A\n## Branch B';
        mockConvertTextToMindmap.mockResolvedValue(converted);
        addNode('n1', 'Plain prose content here.', 'text');

        await toggleContentModeWithUndo('n1');

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.data.contentMode).toBe('mindmap');
        expect(node?.data.output).toBe(converted);
    });

    it('pushes to undo stack after AI conversion, and undo restores original prose', async () => {
        const { toggleContentModeWithUndo } = await import('../contentModeToggleService');
        const originalProse = 'Original plain text.';
        mockConvertTextToMindmap.mockResolvedValue('# Title\n## A\n## B');
        addNode('n1', originalProse, 'text');

        await toggleContentModeWithUndo('n1');
        expect(useHistoryStore.getState().undoStack).toHaveLength(1);

        useHistoryStore.getState().dispatch({ type: 'UNDO' });
        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.data.output).toBe(originalProse);
        expect(node?.data.contentMode).toBe('text');
    });
});

// ── 3. Smart toggle: structured markdown → instant (no AI) ────────────

describe('toggleContentModeWithUndo — structured markdown → no AI call', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
        useHistoryStore.setState({ undoStack: [], redoStack: [] });
        vi.clearAllMocks();
    });

    it('does NOT call convertTextToMindmap when content is already structured markdown', async () => {
        const { toggleContentModeWithUndo } = await import('../contentModeToggleService');
        addNode('n1', '# Topic\n## Branch A\n## Branch B', 'text');

        await toggleContentModeWithUndo('n1');

        expect(mockConvertTextToMindmap).not.toHaveBeenCalled();
    });

    it('sets contentMode to mindmap instantly without changing output', async () => {
        const { toggleContentModeWithUndo } = await import('../contentModeToggleService');
        const structured = '# Topic\n## Branch A\n## Branch B';
        addNode('n1', structured, 'text');

        await toggleContentModeWithUndo('n1');

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.data.contentMode).toBe('mindmap');
        expect(node?.data.output).toBe(structured);
    });

    it('pushes to undo stack and undo reverts mode without touching output', async () => {
        const { toggleContentModeWithUndo } = await import('../contentModeToggleService');
        const structured = '# Topic\n## Branch A\n## Branch B';
        addNode('n1', structured, 'text');

        await toggleContentModeWithUndo('n1');
        useHistoryStore.getState().dispatch({ type: 'UNDO' });

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.data.contentMode).toBe('text');
        expect(node?.data.output).toBe(structured);
    });
});

// ── 4. Smart toggle: mindmap → text is always instant ─────────────────

describe('toggleContentModeWithUndo — mindmap → text (always instant)', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
        useHistoryStore.setState({ undoStack: [], redoStack: [] });
        vi.clearAllMocks();
    });

    it('does NOT call AI when toggling from mindmap back to text', async () => {
        const { toggleContentModeWithUndo } = await import('../contentModeToggleService');
        addNode('n1', '# Topic\n## Branch', 'mindmap');

        await toggleContentModeWithUndo('n1');

        expect(mockConvertTextToMindmap).not.toHaveBeenCalled();
        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.data.contentMode).toBe('text');
    });
});

// ── 5. Empty node → warns, does not call AI ───────────────────────────

describe('toggleContentModeWithUndo — empty content', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
        vi.clearAllMocks();
    });

    it('shows warning toast and does not call AI when node has no content', async () => {
        const { toggleContentModeWithUndo } = await import('../contentModeToggleService');
        const { toast } = await import('@/shared/stores/toastStore');
        addNode('n1', '', 'text');

        await toggleContentModeWithUndo('n1');

        expect(mockConvertTextToMindmap).not.toHaveBeenCalled();
        expect(toast.warning).toHaveBeenCalled();
    });
});
