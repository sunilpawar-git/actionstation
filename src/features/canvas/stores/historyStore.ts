/**
 * historyStore — Isolated Zustand store for canvas undo/redo.
 * Completely separate from useCanvasStore to prevent subscription cascades.
 * Side effects (cmd.undo/cmd.redo, toast, analytics) execute in dispatch(),
 * keeping the reducer pure.
 */
import { create } from 'zustand';
import { historyReducer } from './historyReducer';
import { INITIAL_HISTORY_STATE, type HistoryState, type HistoryAction } from '../types/history';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { trackCanvasUndo, trackCanvasRedo } from '@/shared/services/analyticsService';

/** Undo of transformContent still warrants a toast since it has no dedicated call-site toast */
const TOAST_ON_UNDO: ReadonlySet<string> = new Set(['transformContent']);

interface HistoryStore extends HistoryState {
    /** One-shot dispatch: side effects → reducer(state, action) → set(newState) */
    dispatch: (action: HistoryAction) => void;
}

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
    ...INITIAL_HISTORY_STATE,

    dispatch: (action: HistoryAction) => {
        const hc = strings.canvas.history;

        // Execute side effects OUTSIDE the reducer (keeps reducer truly pure)
        if (action.type === 'UNDO') {
            const stack = get().undoStack;
            const cmd = stack[stack.length - 1];
            if (cmd) {
                cmd.undo();
                trackCanvasUndo(cmd.type, action.source ?? 'keyboard');
                if (TOAST_ON_UNDO.has(cmd.type)) {
                    toast.info(hc.undoTransform);
                }
            }
        }
        if (action.type === 'REDO') {
            const stack = get().redoStack;
            const cmd = stack[stack.length - 1];
            if (cmd) {
                cmd.redo();
                trackCanvasRedo(cmd.type, action.source ?? 'keyboard');
            }
        }

        const currentState: HistoryState = {
            undoStack: get().undoStack,
            redoStack: get().redoStack,
        };
        const newState = historyReducer(currentState, action);
        set(newState); // ONE-SHOT atomic update — no cascading
    },
}));

/** Selector: true when there is at least one undoable command. Minimises re-renders (only toggles). */
export const selectCanUndo = (s: HistoryState) => s.undoStack.length > 0;
/** Selector: true when there is at least one redoable command. Minimises re-renders (only toggles). */
export const selectCanRedo = (s: HistoryState) => s.redoStack.length > 0;
