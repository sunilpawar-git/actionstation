/**
 * Focus Store - ViewModel for node focus mode state
 * SSOT for which node is currently in focus/expanded view
 * Separate from canvasStore to avoid unnecessary re-renders of canvas subscribers
 * Includes reader context for two-pane reader workspace (Phase 11)
 */
import { create } from 'zustand';
import { useCanvasStore, getNodeMap } from './canvasStore';
import { isContentModeMindmap } from '../types/contentMode';
import { trackReaderOpened, trackReaderClosed } from '@/shared/services/analyticsService';
import type { ReaderSource, ReaderContext } from '@/features/reader/types/reader';

interface FocusState {
    focusedNodeId: string | null;
    readerContext: ReaderContext | null;
}

interface FocusActions {
    enterFocus: (nodeId: string) => void;
    exitFocus: () => void;
    openReader: (nodeId: string, source: ReaderSource) => { sessionId: number };
    closeReader: (reason: 'escape' | 'user' | 'navigation') => void;
}

type FocusStore = FocusState & FocusActions;

let nextSessionId = 1;

export const useFocusStore = create<FocusStore>()((set) => ({
    focusedNodeId: null,
    readerContext: null,

    enterFocus: (nodeId: string) => set({ focusedNodeId: nodeId }),

    exitFocus: () => set({ focusedNodeId: null, readerContext: null }),

    openReader: (nodeId: string, source: ReaderSource) => {
        const sessionId = nextSessionId++;
        set({
            focusedNodeId: nodeId,
            readerContext: { nodeId, source, sessionId },
        });
        trackReaderOpened(source.type, 'focus');
        return { sessionId };
    },

    closeReader: (reason: 'escape' | 'user' | 'navigation') => {
        const { readerContext } = useFocusStore.getState();
        if (readerContext) trackReaderClosed(readerContext.source.type, reason);
        set({ readerContext: null });
    },
}));

/** SSOT helper: enter focus + start editing in one batched call.
 *  Mindmap nodes open in view-only mode (no startEditing) so the
 *  MindmapRenderer is visible instead of the TipTap editor. */
export function enterFocusWithEditing(nodeId: string): void {
    useFocusStore.getState().enterFocus(nodeId);
    const state = useCanvasStore.getState();
    const node = getNodeMap(state.nodes).get(nodeId);
    if (!isContentModeMindmap(node?.data.contentMode)) {
        state.startEditing(nodeId);
    }
}

/** Reset session counter — for testing only */
export function _resetSessionId(): void {
    nextSessionId = 1;
}
