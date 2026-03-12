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
import type React from 'react';
import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useHistoryStore } from '@/features/canvas/stores/historyStore';
import { isEditableTarget } from '@/shared/utils/domGuards';
import { useEscapeLayer, getHighestEscapePriority } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { captureError } from '@/shared/services/sentryService';

interface KeyboardShortcutsOptions {
    onOpenSettings?: () => void;
    onAddNode?: () => void;
    onQuickCapture?: () => void;
    /** May be async (shows confirm dialog for bulk deletes). Promise rejections are caught internally. */
    onDeleteNodes?: (nodeIds: string[]) => void | Promise<void>;
    /**
     * Returns true during the ~50 ms window after ⌘+N while the newly created
     * node is being positioned and focused. Prevents a stray plain-n press from
     * adding a second node during that window (quick-capture race guard).
     * Provided by KeyboardShortcutsProvider via useQuickCapture.isNodeCreationLocked.
     */
    isNodeCreationLocked?: () => boolean;
    /** Ref to the SearchBar component for ⌘+K focus (Phase 8) */
    searchInputRef?: React.RefObject<{ focus: () => void; select: () => void }>;
}

function hasModifier(e: KeyboardEvent): boolean {
    return e.metaKey || e.ctrlKey;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
    // Subscribe to a BOOLEAN primitive so Zustand's Object.is check suppresses
    // re-renders when selection changes size but the "has any selection" state
    // does not change (e.g. 2→3 nodes selected). Subscribing to the full Set
    // reference would re-render (and re-register the document listener) on
    // every individual node select/deselect during drag-select operations.
    const hasSelection = useCanvasStore((s) => s.selectedNodeIds.size > 0);
    const editingNodeId = useCanvasStore((s) => s.editingNodeId);
    const { onOpenSettings, onAddNode, onQuickCapture, onDeleteNodes, isNodeCreationLocked, searchInputRef } = options;

    // NOTE: `selectedNodeIds` is read via getState() inside handlePlainShortcuts
    // (not closed over here) so the handler identity stays stable and we avoid
    // re-registering the document listener on every selection change.
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (handleModifierShortcuts(e, onQuickCapture, onOpenSettings, searchInputRef)) {
                return;
            }

            if (editingNodeId) return;
            if (isEditableTarget(e)) return;

            handlePlainShortcuts(e, onAddNode, onDeleteNodes, isNodeCreationLocked);
        },
        [editingNodeId, onOpenSettings, onAddNode, onQuickCapture, onDeleteNodes, isNodeCreationLocked, searchInputRef]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => {
            document.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, [handleKeyDown]);

    const escapeActive = !editingNodeId && hasSelection;
    const handleClearSelection = useCallback(() => {
        useCanvasStore.getState().clearSelection();
    }, []);
    useEscapeLayer(ESCAPE_PRIORITY.CLEAR_SELECTION, escapeActive, handleClearSelection);
}

/** Undo/Redo shortcuts (z, z+shift, y). Returns true if handled. */
function handleUndoRedoShortcuts(e: KeyboardEvent): boolean {
    if (e.key === 'z' && !e.shiftKey) {
        if (isEditableTarget(e)) return false;
        e.preventDefault();
        e.stopImmediatePropagation();
        useHistoryStore.getState().dispatch({ type: 'UNDO' });
        return true;
    }
    if (e.key === 'z' && e.shiftKey) {
        if (isEditableTarget(e)) return false;
        e.preventDefault();
        e.stopImmediatePropagation();
        useHistoryStore.getState().dispatch({ type: 'REDO' });
        return true;
    }
    if (e.key === 'y') {
        if (isEditableTarget(e)) return false;
        e.preventDefault();
        e.stopImmediatePropagation();
        useHistoryStore.getState().dispatch({ type: 'REDO' });
        return true;
    }
    return false;
}

/** Modifier shortcuts (Cmd/Ctrl+key). Returns true if handled. */
function handleModifierShortcuts(
    e: KeyboardEvent,
    onQuickCapture?: () => void,
    onOpenSettings?: () => void,
    searchInputRef?: React.RefObject<{ focus: () => void; select: () => void } | null>,
): boolean {
    if (!hasModifier(e)) return false;

    // ⌘+K / Ctrl+K: Focus search input (Phase 8)
    if (e.key === 'k' || e.key === 'K') {
        // Don't fire when user is already typing in a node editor
        if (e.target instanceof HTMLElement && e.target.closest('[data-node-editor]')) return false;
        e.preventDefault();
        e.stopImmediatePropagation();
        searchInputRef?.current?.focus();
        searchInputRef?.current?.select();
        return true;
    }

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

    return handleUndoRedoShortcuts(e);
}

/**
 * Plain (non-modifier) shortcuts for canvas operations.
 * selectedNodeIds is read from getState() at call time so the enclosing
 * handler does not depend on selection changes (avoids re-registration).
 *
 * ## Guards applied before dispatching
 * 1. Overlay guard — suppresses ALL plain shortcuts when any escape-layer with
 *    priority > CLEAR_SELECTION is active (settings, modal, context menu, etc.).
 *    Uses getHighestEscapePriority() so every future overlay participates
 *    automatically without changes here.
 * 2. Node-creation lock — suppresses plain n during the ~50 ms window after
 *    ⌘+N while the new node is being created (quick-capture race guard).
 */
function handlePlainShortcuts(
    e: KeyboardEvent,
    onAddNode?: () => void,
    onDeleteNodes?: (nodeIds: string[]) => void | Promise<void>,
    isNodeCreationLocked?: () => boolean,
): void {
    // Guard 1: suppress all plain shortcuts while any overlay is open.
    const topPriority = getHighestEscapePriority();
    if (topPriority !== null && topPriority > ESCAPE_PRIORITY.CLEAR_SELECTION) return;

    if (e.key === 'n' || e.key === 'N') {
        // Guard 2: suppress n during the quick-capture 50 ms race window.
        if (isNodeCreationLocked?.()) return;
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
        const deleteResult = onDeleteNodes?.(ids);
        if (deleteResult instanceof Promise) void deleteResult.catch((e: unknown) => captureError(e));
        return;
    }

}
