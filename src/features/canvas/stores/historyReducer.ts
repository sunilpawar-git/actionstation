/**
 * historyReducer — Pure function for all history state transitions.
 * Zero dependencies on Zustand/React. Side effects (cmd.undo/redo)
 * are executed by the store's dispatch(), NOT here.
 */
import {
    MAX_HISTORY_DEPTH,
    INITIAL_HISTORY_STATE,
    type HistoryState,
    type HistoryAction,
    type CanvasCommand,
} from '../types/history';

const COALESCE_WINDOW_MS = 1000;

function isCoalescable(last: CanvasCommand, next: CanvasCommand): boolean {
    return (
        !!next.entityId &&
        last.entityId === next.entityId &&
        last.type === next.type &&
        next.timestamp - last.timestamp < COALESCE_WINDOW_MS
    );
}

function pushCommand(state: HistoryState, command: CanvasCommand): HistoryState {
    const stack = [...state.undoStack];
    const last = stack[stack.length - 1];

    if (last && isCoalescable(last, command)) {
        // Keep original undo, update redo to latest
        stack[stack.length - 1] = { ...last, redo: command.redo, timestamp: command.timestamp };
    } else {
        stack.push(command);
        if (stack.length > MAX_HISTORY_DEPTH) stack.shift();
    }

    return { undoStack: stack, redoStack: [] };
}

function undoCommand(state: HistoryState): HistoryState {
    if (state.undoStack.length === 0) return state;
    const lastIdx = state.undoStack.length - 1;
    const cmd: CanvasCommand | undefined = state.undoStack[lastIdx];
    if (!cmd) return state;
    return {
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, cmd],
    };
}

function redoCommand(state: HistoryState): HistoryState {
    if (state.redoStack.length === 0) return state;
    const lastIdx = state.redoStack.length - 1;
    const cmd: CanvasCommand | undefined = state.redoStack[lastIdx];
    if (!cmd) return state;
    return {
        undoStack: [...state.undoStack, cmd],
        redoStack: state.redoStack.slice(0, -1),
    };
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
    switch (action.type) {
        case 'PUSH': return pushCommand(state, action.command);
        case 'UNDO': return undoCommand(state);
        case 'REDO': return redoCommand(state);
        case 'CLEAR': return INITIAL_HISTORY_STATE;
        default: return state;
    }
}
