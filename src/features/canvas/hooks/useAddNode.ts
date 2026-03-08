/**
 * useAddNode Hook - Create new nodes at next grid position
 * Single source of truth for node creation logic (used by both N shortcut and + button)
 */
import { useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useWorkspaceContext } from '@/app/contexts/WorkspaceContext';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useFocusStore } from '../stores/focusStore';
import { createIdeaNode } from '../types/node';
import { calculateNextNodePosition } from '../stores/canvasStoreHelpers';
import { calculateSmartPlacement } from '../services/freeFlowPlacementService';
import { usePanToNode } from './usePanToNode';
import { trackNodeCreated } from '@/shared/services/analyticsService';
import { useUndoableActions } from './useUndoableActions';

export function useAddNode() {
    const { currentWorkspaceId } = useWorkspaceContext();
    const canvasFreeFlow = useSettingsStore((s) => s.canvasFreeFlow);
    const focusedNodeId = useFocusStore((s) => s.focusedNodeId);
    const { panToPosition } = usePanToNode();
    const { addNodeWithUndo } = useUndoableActions();

    const handleAddNode = useCallback(() => {
        if (!currentWorkspaceId) return;

        // Read nodes at call time via getState() — not via subscription.
        // Subscribing to nodes caused callback recreation on every node change,
        // cascading re-renders through KeyboardShortcutsProvider.
        const nodes = useCanvasStore.getState().nodes;
        const position = canvasFreeFlow
            ? calculateSmartPlacement(nodes, focusedNodeId ?? undefined)
            : calculateNextNodePosition(nodes);

        const newNode = createIdeaNode(
            `idea-${crypto.randomUUID()}`,
            currentWorkspaceId,
            position
        );

        addNodeWithUndo(newNode);
        trackNodeCreated('idea');
        panToPosition(position.x, position.y);
    }, [currentWorkspaceId, canvasFreeFlow, focusedNodeId, panToPosition, addNodeWithUndo]);

    return handleAddNode;
}
