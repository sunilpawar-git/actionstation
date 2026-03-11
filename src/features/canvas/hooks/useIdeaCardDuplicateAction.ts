/**
 * useIdeaCardDuplicateAction — Dedicated hook for IdeaCard duplicate action.
 * Extracted per SRP to keep useIdeaCardActions under the 75-line hook limit.
 * Pans to the new node after duplication so it is always visible.
 */
import { useCallback } from 'react';
import { useCanvasStore, getNodeMap } from '../stores/canvasStore';
import { usePanToNodeContext } from '../contexts/PanToNodeContext';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

export function useIdeaCardDuplicateAction(nodeId: string) {
    const { panToPosition } = usePanToNodeContext();

    const handleDuplicate = useCallback(() => {
        const newId = useCanvasStore.getState().duplicateNode(nodeId);
        if (newId) {
            toast.success(strings.nodeUtils.duplicateSuccess);
            // Defer pan to next frame — prevents viewport mutation during the same
            // React batch as set({nodes}), which can cascade through useSyncExternalStore.
            requestAnimationFrame(() => {
                const newNode = getNodeMap(useCanvasStore.getState().nodes).get(newId);
                if (newNode) panToPosition(newNode.position.x, newNode.position.y);
            });
        } else {
            toast.error(strings.nodeUtils.duplicateError);
        }
    }, [nodeId, panToPosition]);

    return { handleDuplicate };
}
