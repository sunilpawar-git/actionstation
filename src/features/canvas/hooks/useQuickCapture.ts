/**
 * useQuickCapture Hook - Create node and trigger focus for BASB quick capture
 * Returns a function that creates a node and emits an event for focusing
 */
import { useCallback, useRef, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useWorkspaceContext } from '@/app/contexts/WorkspaceContext';
import { DEFAULT_WORKSPACE_ID } from '@/features/workspace/stores/workspaceStore';
import { createIdeaNode, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';
import { useCanvasStore } from '../stores/canvasStore';
import { findNearestOpenSlot } from '../services/spiralPlacement';
import { useUndoableActions } from './useUndoableActions';

// Custom event for focusing a newly created node
export const FOCUS_NODE_EVENT = 'actionstation:focusNode';

export interface FocusNodeEvent extends CustomEvent {
    detail: { nodeId: string };
}

/**
 * Module-level creation lock — true during the ~50 ms between ⌘+N firing and
 * the new node receiving focus. Prevents a simultaneous plain-n press from
 * creating a second node (quick-capture race guard).
 */
let _nodeCreationLocked = false;

/**
 * Returns true while a quick-capture node is being created.
 * Consumed by useKeyboardShortcuts (via KeyboardShortcutsProvider) to
 * suppress plain-n during the race window.
 */
export function isNodeCreationLocked(): boolean {
    return _nodeCreationLocked;
}

/** Visible for testing — resets the creation lock between test runs. */
export function _resetNodeCreationLock(): void {
    _nodeCreationLocked = false;
}

/** Visible for testing — sets the creation lock (simulates ⌘+N mid-flight). */
export function _setNodeCreationLocked(): void {
    _nodeCreationLocked = true;
}

export function useQuickCapture() {
    const { screenToFlowPosition } = useReactFlow();
    const { currentWorkspaceId } = useWorkspaceContext();
    const { addNodeWithUndo } = useUndoableActions();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clear any pending focus timer on unmount so we never dispatch a stale
    // focus event into an unmounted tree, and never leave the creation lock
    // stuck at true (which would permanently suppress the plain-n shortcut).
    useEffect(() => {
        return () => {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
                _nodeCreationLocked = false;
            }
        };
    }, []);

    const handleQuickCapture = useCallback(() => {
        // Prevent a second quick-capture if one is already in flight.
        if (_nodeCreationLocked) return;
        _nodeCreationLocked = true;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const rawPosition = screenToFlowPosition({
            x: centerX,
            y: centerY,
        });

        const nodes = useCanvasStore.getState().nodes;
        const position = findNearestOpenSlot(
            rawPosition.x, rawPosition.y, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes,
        );

        const nodeId = `idea-${crypto.randomUUID()}`;
        const newNode = createIdeaNode(
            nodeId,
            currentWorkspaceId ?? DEFAULT_WORKSPACE_ID,
            position
        );

        addNodeWithUndo(newNode);

        // Store the timer ID in a ref so the cleanup useEffect can cancel it
        // if the component unmounts during the 50 ms focus window.
        timerRef.current = setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent(FOCUS_NODE_EVENT, { detail: { nodeId } })
            );
            timerRef.current = null;
            _nodeCreationLocked = false;
        }, 50);
    }, [screenToFlowPosition, currentWorkspaceId, addNodeWithUndo]);

    return handleQuickCapture;
}
