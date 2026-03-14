import { describe, it, expect, beforeEach } from 'vitest';
import { useFocusStore, _resetSessionId } from '@/features/canvas/stores/focusStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { ReaderSource, SafeReaderUrl } from '../types/reader';

const TEST_URL = 'https://firebasestorage.googleapis.com/test.pdf' as SafeReaderUrl;

const pdfSource: ReaderSource = {
    type: 'pdf',
    url: TEST_URL,
    filename: 'test.pdf',
    sourceId: 'att-test',
    mime: 'application/pdf',
};

const makeNode = (id: string, contentMode?: 'text' | 'mindmap'): CanvasNode => ({
    id, workspaceId: 'ws-1', type: 'idea',
    data: { heading: 'Test', output: '', contentMode },
    position: { x: 0, y: 0 }, width: 500, height: 400,
    createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-01'),
});

function seedCanvas(nodes: CanvasNode[]) {
    useCanvasStore.setState({
        nodes, edges: [], selectedNodeIds: new Set(),
        editingNodeId: null, draftContent: null, inputMode: 'note',
    });
}

describe('focusStore reader transitions', () => {
    beforeEach(() => {
        useFocusStore.getState().exitFocus();
        useCanvasStore.setState({ editingNodeId: null });
        _resetSessionId();
    });

    it('openReader sets readerContext and focusedNodeId', () => {
        const { sessionId } = useFocusStore.getState().openReader('node-1', pdfSource);
        const state = useFocusStore.getState();

        expect(state.focusedNodeId).toBe('node-1');
        expect(state.readerContext).not.toBeNull();
        expect(state.readerContext?.nodeId).toBe('node-1');
        expect(state.readerContext?.source).toBe(pdfSource);
        expect(state.readerContext?.sessionId).toBe(sessionId);
    });

    it('sessionId increments monotonically', () => {
        const { sessionId: s1 } = useFocusStore.getState().openReader('n1', pdfSource);
        const { sessionId: s2 } = useFocusStore.getState().openReader('n2', pdfSource);
        const { sessionId: s3 } = useFocusStore.getState().openReader('n3', pdfSource);

        expect(s2).toBeGreaterThan(s1);
        expect(s3).toBeGreaterThan(s2);
    });

    it('closeReader clears readerContext but keeps focusedNodeId', () => {
        useFocusStore.getState().openReader('node-1', pdfSource);
        useFocusStore.getState().closeReader('user');
        const state = useFocusStore.getState();

        expect(state.readerContext).toBeNull();
        expect(state.focusedNodeId).toBe('node-1');
    });

    it('exitFocus clears both focusedNodeId and readerContext', () => {
        useFocusStore.getState().openReader('node-1', pdfSource);
        useFocusStore.getState().exitFocus();
        const state = useFocusStore.getState();

        expect(state.focusedNodeId).toBeNull();
        expect(state.readerContext).toBeNull();
    });

    it('opening reader for different source updates readerContext', () => {
        useFocusStore.getState().openReader('node-1', pdfSource);
        const imgSource: ReaderSource = {
            type: 'image',
            url: TEST_URL,
            filename: 'img.png',
            sourceId: 'att-img',
            mime: 'image/png',
        };
        const { sessionId } = useFocusStore.getState().openReader('node-1', imgSource);
        const ctx = useFocusStore.getState().readerContext;

        expect(ctx?.source.type).toBe('image');
        expect(ctx?.sessionId).toBe(sessionId);
    });
});

describe('openReader starts editing (note-taking workflow)', () => {
    beforeEach(() => {
        useFocusStore.getState().exitFocus();
        _resetSessionId();
    });

    it('calls startEditing for a text-mode node', () => {
        seedCanvas([makeNode('n-text', 'text')]);
        useFocusStore.getState().openReader('n-text', pdfSource);
        expect(useCanvasStore.getState().editingNodeId).toBe('n-text');
    });

    it('calls startEditing for a legacy node (no contentMode)', () => {
        seedCanvas([makeNode('n-legacy')]);
        useFocusStore.getState().openReader('n-legacy', pdfSource);
        expect(useCanvasStore.getState().editingNodeId).toBe('n-legacy');
    });

    it('does NOT call startEditing for a mindmap node', () => {
        seedCanvas([makeNode('n-mm', 'mindmap')]);
        useFocusStore.getState().openReader('n-mm', pdfSource);
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
    });
});
