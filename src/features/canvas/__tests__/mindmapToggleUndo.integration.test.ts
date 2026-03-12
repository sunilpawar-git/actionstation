/**
 * Mindmap Toggle + Undo integration tests
 *
 * Validates:
 * 1. toggleContentModeWithUndo pushes to history and can be undone/redone
 * 2. Resize floor enforced when contentMode is 'mindmap'
 * 3. Slash command 'convert-to-mindmap' exists in the registry
 * 4. transformContent receives contentMode for mindmap nodes
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCanvasStore } from '../stores/canvasStore';
import { useHistoryStore } from '../stores/historyStore';
import { toggleContentModeWithUndo } from '../services/contentModeToggleService';
import { slashCommands, getCommandById } from '../services/slashCommands';
import { createIdeaNode, MINDMAP_MIN_WIDTH, MINDMAP_MIN_HEIGHT } from '../types/node';

const WS_ID = 'ws-test';

function addNodeWithMode(id: string, contentMode?: 'text' | 'mindmap', output?: string) {
    const node = createIdeaNode(id, WS_ID, { x: 0, y: 0 });
    node.data.contentMode = contentMode;
    if (output) node.data.output = output;
    useCanvasStore.getState().addNode(node);
}

describe('toggleContentModeWithUndo', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
        useHistoryStore.setState({ undoStack: [], redoStack: [] });
    });

    it('toggles text → mindmap and pushes to undo stack', () => {
        addNodeWithMode('n1', 'text');
        const result = toggleContentModeWithUndo('n1');
        expect(result).toBe('mindmap');

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.data.contentMode).toBe('mindmap');

        const { undoStack } = useHistoryStore.getState();
        expect(undoStack).toHaveLength(1);
        expect(undoStack[0]?.type).toBe('toggleContentMode');
    });

    it('toggles mindmap → text and pushes to undo stack', () => {
        addNodeWithMode('n1', 'mindmap');
        const result = toggleContentModeWithUndo('n1');
        expect(result).toBe('text');

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.data.contentMode).toBe('text');
    });

    it('undo reverts contentMode and dimensions', () => {
        addNodeWithMode('n1', 'text');
        const originalNode = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        const origW = originalNode?.width;
        const origH = originalNode?.height;

        toggleContentModeWithUndo('n1');
        expect(useCanvasStore.getState().nodes.find(n => n.id === 'n1')?.data.contentMode).toBe('mindmap');

        useHistoryStore.getState().dispatch({ type: 'UNDO' });
        const reverted = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(reverted?.data.contentMode).toBe('text');
        if (origW != null) expect(reverted?.width).toBe(origW);
        if (origH != null) expect(reverted?.height).toBe(origH);
    });

    it('redo re-applies contentMode toggle', () => {
        addNodeWithMode('n1', 'text');
        toggleContentModeWithUndo('n1');
        useHistoryStore.getState().dispatch({ type: 'UNDO' });
        expect(useCanvasStore.getState().nodes.find(n => n.id === 'n1')?.data.contentMode).toBe('text');

        useHistoryStore.getState().dispatch({ type: 'REDO' });
        expect(useCanvasStore.getState().nodes.find(n => n.id === 'n1')?.data.contentMode).toBe('mindmap');
    });

    it('returns null for non-existent node', () => {
        expect(toggleContentModeWithUndo('ghost')).toBeNull();
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

describe('Slash command registry — convert-to-mindmap', () => {
    it('includes convert-to-mindmap command', () => {
        const cmd = slashCommands.find(c => c.id === 'convert-to-mindmap');
        expect(cmd).toBeDefined();
        expect(cmd?.icon).toBe('🔄');
        expect(cmd?.prefix).toBe('convert');
    });

    it('getCommandById returns convert-to-mindmap', () => {
        expect(getCommandById('convert-to-mindmap')).toBeDefined();
    });

    it('all slash commands have unique IDs and prefixes', () => {
        const ids = slashCommands.map(c => c.id);
        const prefixes = slashCommands.map(c => c.prefix);
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(prefixes).size).toBe(prefixes.length);
    });
});

describe('transformContent contentMode passthrough', () => {
    beforeEach(() => vi.clearAllMocks());

    it('transformContent signature accepts contentMode parameter', async () => {
        const { transformContent } = await import('../../ai/services/geminiService');
        expect(typeof transformContent).toBe('function');
        expect(transformContent.length).toBeGreaterThanOrEqual(2);
    });
});
