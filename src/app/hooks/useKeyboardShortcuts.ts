/**
 * useKeyboardShortcuts Hook - Global keyboard shortcuts
 * Registered on document capture phase to intercept before browser defaults.
 *
 * ## Dual isEditableTarget guard
 * Modifier shortcuts (Cmd+Z, Cmd+N, etc.) check `isEditableTarget` per-key
 * so that e.g. Cmd+N still fires inside a <textarea> (Quick Capture) while
 * Cmd+Z is suppressed so TipTap can own its own undo stack.
 * Plain shortcuts (n, Delete) must NEVER fire inside editable elements, so a
 * blanket `isEditableTarget` guard runs once before dispatching.
 */
import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useHistoryStore } from '@/features/canvas/stores/historyStore';
import { isEditableTarget } from '@/shared/utils/domGuards';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { captureError } from '@/shared/services/sentryService';

interface KeyboardShortcutsOptions {
    onOpenSettings?: () => void;
    onAddNode?: () => void;
    onQuickCapture?: () => void;
    /** May be async (shows confirm dialog for bulk deletes). Promise rejections are caught internally. */
    onDeleteNodes?: (nodeIds: string[]) => void | Promise<void>;
}

function hasModifier(e: KeyboardEvent): boolean {
    return e.metaKey || e.ctrlKey;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
    const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
    const editingNodeId = useCanvasStore((s) => s.editingNodeId);
    const { onOpenSettings, onAddNode, onQuickCapture, onDeleteNodes } = options;

    // NOTE: `selectedNodeIds` is intentionally read via getState() inside
    // handlePlainShortcuts rather than closed over, so the handler identity
    // stays stable and we avoid re-registering the document listener on every
    // selection change.
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (handleModifierShortcuts(e, onQuickCapture, onOpenSettings)) {
                return;
            }

            if (editingNodeId) return;
            if (isEditableTarget(e)) return;

            handlePlainShortcuts(e, onAddNode, onDeleteNodes);
        },
        [editingNodeId, onOpenSettings, onAddNode, onQuickCapture, onDeleteNodes]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => {
            document.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, [handleKeyDown]);

    const escapeActive = !editingNodeId && selectedNodeIds.size > 0;
    const handleClearSelection = useCallback(() => {
        useCanvasStore.getState().clearSelection();
    }, []);
    useEscapeLayer(ESCAPE_PRIORITY.CLEAR_SELECTION, escapeActive, handleClearSelection);
}

/** Modifier shortcuts (Cmd/Ctrl+key). Returns true if handled. */
function handleModifierShortcuts(
    e: KeyboardEvent,
    onQuickCapture?: () => void,
    onOpenSettings?: () => void,
): boolean {
    if (!hasModifier(e)) return false;

    if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onQuickCapture?.();
        return true;
    }

    if (e.key === ',') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onOpenSettings?.();
        return true;
    }

    // Undo: Ctrl+Z / Cmd+Z (skip if editing text — let TipTap handle its own undo)
    if (e.key === 'z' && !e.shiftKey) {
        if (isEditableTarget(e)) return false;
        e.preventDefault();
        e.stopImmediatePropagation();
        useHistoryStore.getState().dispatch({ type: 'UNDO' });
        return true;
    }

    // Redo: Ctrl+Shift+Z / Cmd+Shift+Z
    if (e.key === 'z' && e.shiftKey) {
        if (isEditableTarget(e)) return false;
        e.preventDefault();
        e.stopImmediatePropagation();
        useHistoryStore.getState().dispatch({ type: 'REDO' });
        return true;
    }

    // Redo: Ctrl+Y (Windows convention)
    if (e.key === 'y') {
        if (isEditableTarget(e)) return false;
        e.preventDefault();
        e.stopImmediatePropagation();
        useHistoryStore.getState().dispatch({ type: 'REDO' });
        return true;
    }

    return false;
}

/**
 * Plain (non-modifier) shortcuts for canvas operations.
 * selectedNodeIds is read from getState() at call time so the enclosing
 * handler does not depend on selection changes (avoids re-registration).
 */
function handlePlainShortcuts(
    e: KeyboardEvent,
    onAddNode?: () => void,
    onDeleteNodes?: (nodeIds: string[]) => void,
): void {
    if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onAddNode?.();
        return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const ids = [...useCanvasStore.getState().selectedNodeIds];
        if (ids.length === 0) return;
        // NOTE: do NOT call clearSelection() here — deleteNodeWithUndo is async
        // and shows a confirm dialog for bulk deletes. Calling clearSelection()
        // synchronously would clear the user's selection before they confirm,
        // and leave it cleared even if they cancel. deleteNodes() removes the
        // deleted nodes from selectedNodeIds atomically inside the same set() call.
        void onDeleteNodes?.(ids)?.catch((e: unknown) => captureError(e));
        return;
    }

}
