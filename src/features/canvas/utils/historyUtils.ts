/**
 * historyUtils — Pure helper functions for recording canvas commands.
 *
 * These are plain (non-hook) functions intentionally kept outside of
 * useUndoableActions so they can be imported by any hook or service without
 * pulling in React hook machinery.
 */
import { useHistoryStore } from '../stores/historyStore';
import type { CanvasCommandType } from '../types/history';

/** Dispatch a command to the isolated history store */
export function pushCmd(
    type: CanvasCommandType,
    undo: () => void,
    redo: () => void,
    entityId?: string,
): void {
    useHistoryStore.getState().dispatch({
        type: 'PUSH',
        command: { type, timestamp: Date.now(), undo, redo, entityId },
    });
}

/**
 * Higher-order helper: execute the action first, then push to history.
 * This order is intentional — only records successful operations.
 */
export function withUndo(
    type: CanvasCommandType,
    execute: () => void,
    reverse: () => void,
    entityId?: string,
): void {
    execute();
    pushCmd(type, reverse, execute, entityId);
}
