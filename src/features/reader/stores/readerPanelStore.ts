/**
 * Reader Panel Store — Canvas-level reader side panel state.
 * Separate from focusStore: allows reading alongside the canvas
 * without entering focus mode. Enables multi-node BASB workflows.
 */
import { create } from 'zustand';
import { trackReaderOpened, trackReaderClosed } from '@/shared/services/analyticsService';
import type { ReaderSource, ReaderContext } from '../types/reader';

interface ReaderPanelState {
    isOpen: boolean;
    readerContext: ReaderContext | null;
}

interface ReaderPanelActions {
    openPanel: (source: ReaderSource) => { sessionId: number };
    closePanel: () => void;
}

type ReaderPanelStore = ReaderPanelState & ReaderPanelActions;

let nextPanelSessionId = 1;

export const useReaderPanelStore = create<ReaderPanelStore>()((set) => ({
    isOpen: false,
    readerContext: null,

    openPanel: (source: ReaderSource) => {
        const sessionId = nextPanelSessionId++;
        set({
            isOpen: true,
            readerContext: { nodeId: '', source, sessionId },
        });
        trackReaderOpened(source.type, 'sidePanel');
        return { sessionId };
    },

    closePanel: () => {
        const { readerContext } = useReaderPanelStore.getState();
        if (readerContext) trackReaderClosed(readerContext.source.type, 'user');
        set({ isOpen: false, readerContext: null });
    },
}));

/** Reset session counter — for testing only */
export function _resetPanelSessionId(): void {
    nextPanelSessionId = 1;
}
