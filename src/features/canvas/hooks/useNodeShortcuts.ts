/**
 * useNodeShortcuts -- Document-level keyboard shortcuts for selected nodes
 *
 * Listens on `document` (not on a specific DOM element) so shortcuts fire
 * regardless of which element has focus. Only active when the node is
 * selected AND not being edited.
 *
 * Guards:
 * - Skips when editingNodeId is set (any node is in edit mode)
 * - Skips when target is an input/textarea/contenteditable
 * - Only processes single-char keys without modifiers
 */
import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { isEditableTarget } from '@/shared/utils/domGuards';
import { GLOBAL_SHORTCUT_KEYS, toLowerKey } from '@/shared/constants/shortcutKeys';
import type { NodeShortcutMap } from './useNodeInput';

export function useNodeShortcuts(
    selected: boolean,
    shortcuts: NodeShortcutMap,
): void {
    // Previously subscribed to `(s) => s.editingNodeId !== null` -- a boolean
    // selector. While it short-circuits non-null-to-non-null transitions, it
    // still causes O(N) re-renders on every edit start (null to non-null) and
    // stop (non-null to null) because ALL N IdeaCards flip false/true at once.
    // Fix: read editingNodeId inside the event handler via getState() -- zero
    // Zustand subscriptions, zero re-renders from editing transitions.

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!selected) return;
        if (useCanvasStore.getState().editingNodeId !== null) return;
        if (isEditableTarget(e)) return;

        // Only handle single-char keys without modifiers
        const isSingleChar = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (!isSingleChar) return;

        if (GLOBAL_SHORTCUT_KEYS.has(toLowerKey(e.key))) return;

        const handler = shortcuts[toLowerKey(e.key)];
        if (handler) {
            e.preventDefault();
            e.stopPropagation();
            handler();
        }
    }, [selected, shortcuts]);

    useEffect(() => {
        if (!selected) return;

        document.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [selected, handleKeyDown]);
}
