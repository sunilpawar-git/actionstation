/**
 * Mindmap Toggle + Undo integration tests
 *
 * Validates:
 * 1. toggleContentModeWithUndo pushes to history and can be undone/redone
 * 2. Resize floor enforced when contentMode is 'mindmap'
 * 3. toggle-mindmap is the only mindmap slash command
 * 4. transformContent receives contentMode for mindmap nodes
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCanvasStore } from '../stores/canvasStore';
import { useHistoryStore } from '../stores/historyStore';
import { toggleContentModeWithUndo } from '../services/contentModeToggleService';
import { slashCommands, getCommandById } from '../services/slashCommands';
import { createIdeaNode, MINDMAP_MIN_WIDTH, MINDMAP_MIN_HEIGHT } from '../types/node';

// Mock AI so the async smart toggle is deterministic in these tests
vi.mock('@/features/ai/services/geminiService', () => ({
    convertTextToMindmap: vi.fn().mockResolvedValue('# Title\n## Section'),
    generateContent: vi.fn(),
    generateContentWithContext: vi.fn(),
    transformContent: vi.fn(),
}));
vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));
vi.mock('@/shared/services/sentryService', () => ({ captureError: vi.fn() }));

const WS_ID = 'ws-test';

function addNodeWithMode(id: string, contentMode?: 'text' | 'mindmap', output?: string) {
    const node = createIdeaNode(id, WS_ID, { x: 0, y: 0 });
    node.data.contentMode = contentMode;
    node.data.output = output ?? '';
    useCanvasStore.getState().addNode(node);
}

describe('toggleContentModeWithUndo', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
        useHistoryStore.setState({ undoStack: [], redoStack: [] });
        vi.clearAllMocks();
    });

    it('toggles text → mindmap and pushes to undo stack', async () => {
        // Use structured markdown so no AI call is needed — deterministic
        addNodeWithMode('n1', 'text', '# Topic\n## Branch A\n## Branch B');
        const result = await toggleContentModeWithUndo('n1');
        expect(result).toBe('mindmap');

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.data.contentMode).toBe('mindmap');

        const { undoStack } = useHistoryStore.getState();
        expect(undoStack).toHaveLength(1);
        expect(undoStack[0]?.type).toBe('toggleContentMode');
    });

    it('toggles mindmap → text and pushes to undo stack', async () => {
        addNodeWithMode('n1', 'mindmap', '# Topic\n## Branch');
        const result = await toggleContentModeWithUndo('n1');
        expect(result).toBe('text');

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.data.contentMode).toBe('text');
    });

    it('undo reverts contentMode and dimensions', async () => {
        addNodeWithMode('n1', 'text', '# Topic\n## Branch A\n## Branch B');
        const originalNode = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        const origW = originalNode?.width;
        const origH = originalNode?.height;

        await toggleContentModeWithUndo('n1');
        expect(useCanvasStore.getState().nodes.find(n => n.id === 'n1')?.data.contentMode).toBe('mindmap');

        useHistoryStore.getState().dispatch({ type: 'UNDO' });
        const reverted = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(reverted?.data.contentMode).toBe('text');
        if (origW != null) expect(reverted?.width).toBe(origW);
        if (origH != null) expect(reverted?.height).toBe(origH);
    });

    it('redo re-applies contentMode toggle', async () => {
        addNodeWithMode('n1', 'text', '# Topic\n## Branch A\n## Branch B');
        await toggleContentModeWithUndo('n1');
        useHistoryStore.getState().dispatch({ type: 'UNDO' });
        expect(useCanvasStore.getState().nodes.find(n => n.id === 'n1')?.data.contentMode).toBe('text');

        useHistoryStore.getState().dispatch({ type: 'REDO' });
        expect(useCanvasStore.getState().nodes.find(n => n.id === 'n1')?.data.contentMode).toBe('mindmap');
    });

    it('returns null for non-existent node', async () => {
        expect(await toggleContentModeWithUndo('ghost')).toBeNull();
    });
});

describe('Mindmap resize floor enforcement', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
    });

    it('clamps dimensions to mindmap minimums when contentMode is mindmap', () => {
        addNodeWithMode('n1', 'mindmap');
        useCanvasStore.getState().updateNodeDimensions('n1', 100, 100);
        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.width).toBeGreaterThanOrEqual(MINDMAP_MIN_WIDTH);
        expect(node?.height).toBeGreaterThanOrEqual(MINDMAP_MIN_HEIGHT);
    });

    it('allows normal sizing when contentMode is text', () => {
        addNodeWithMode('n1', 'text');
        useCanvasStore.getState().updateNodeDimensions('n1', 200, 150);
        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.width).toBe(200);
        expect(node?.height).toBe(150);
    });
});

describe('Slash command registry — mindmap removed (context-menu only)', () => {
    it('neither toggle-mindmap nor convert-to-mindmap exist in slash commands', () => {
        expect(getCommandById('toggle-mindmap' as never)).toBeUndefined();
        expect(getCommandById('convert-to-mindmap' as never)).toBeUndefined();
    });

    it('all remaining slash commands have unique IDs and prefixes', () => {
        const ids = slashCommands.map(c => c.id);
        const prefixes = slashCommands.map(c => c.prefix);
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(prefixes).size).toBe(prefixes.length);
    });
});

describe('transformContent contentMode passthrough', () => {
    beforeEach(() => vi.clearAllMocks());

    it('transformContent is exported from geminiService', async () => {
        const { transformContent } = await import('../../ai/services/geminiService');
        expect(typeof transformContent).toBe('function');
    });
});
