/**
 * useIdeaCardActions - Extracted action callbacks for IdeaCard
 * Reduces IdeaCard component size by encapsulating side-effect handlers
 */
import { useCallback, useEffect } from 'react';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useUndoableActions } from './useUndoableActions';
import { captureError } from '@/shared/services/sentryService';
import { useNodeTransformation, type TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import { FOCUS_NODE_EVENT, type FocusNodeEvent } from './useQuickCapture';

interface UseIdeaCardActionsOptions {
    nodeId: string;
    getEditableContent: () => string;
    contentRef: React.RefObject<HTMLDivElement | null>;
    generateFromPrompt: (nodeId: string) => void | Promise<void>;
    branchFromNode: (nodeId: string) => string | undefined;
}

/** Encapsulates delete, copy, regenerate, transform, connect, tags, scroll, and focus handlers */
export function useIdeaCardActions(options: UseIdeaCardActionsOptions) {
    const { nodeId, getEditableContent, contentRef, generateFromPrompt, branchFromNode } = options;
    const { transformNodeContent, isTransforming } = useNodeTransformation();

    // NOTE: we previously deleted nodes directly from the canvas store here.
    // That bypassed the new undo/redo infrastructure, so keyboard or button
    // deletes would not be recoverable.  Use the undoable wrapper instead.
    const { deleteNodeWithUndo } = useUndoableActions();
    const handleDelete = useCallback(() => {
        // deleteNodeWithUndo accepts an array of ids; most callers only
        // delete a single node but we keep the signature for consistency.
        void deleteNodeWithUndo([nodeId]).catch((e: unknown) => captureError(e));
    }, [nodeId, deleteNodeWithUndo]);
    const handleRegenerate = useCallback(() => { void generateFromPrompt(nodeId); }, [nodeId, generateFromPrompt]);
    const handleConnectClick = useCallback(() => { void branchFromNode(nodeId); }, [nodeId, branchFromNode]);
    const handleTransform = useCallback((type: TransformationType) => {
        void transformNodeContent(nodeId, type);
    }, [nodeId, transformNodeContent]);

    const handleHeadingChange = useCallback((h: string) => {
        useCanvasStore.getState().updateNodeHeading(nodeId, h);
    }, [nodeId]);

    const handleCopy = useCallback(async () => {
        try {
            const text = contentRef.current?.innerText ?? getEditableContent();
            await navigator.clipboard.writeText(text);
            toast.success(strings.nodeUtils.copySuccess);
        } catch {
            toast.error(strings.nodeUtils.copyError);
        }
    }, [getEditableContent, contentRef]);

    const handleTagsChange = useCallback((ids: string[]) => {
        useCanvasStore.getState().updateNodeTags(nodeId, ids);
    }, [nodeId]);

    // Wheel stop propagation for scrollable content
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        const h = (e: WheelEvent) => e.stopPropagation();
        el.addEventListener('wheel', h, { passive: false });
        return () => el.removeEventListener('wheel', h);
    }, [contentRef]);

    // Focus node event listener
    useEffect(() => {
        const h = (e: Event) => {
            if ((e as FocusNodeEvent).detail.nodeId === nodeId) {
                useCanvasStore.getState().startEditing(nodeId);
            }
        };
        window.addEventListener(FOCUS_NODE_EVENT, h);
        return () => window.removeEventListener(FOCUS_NODE_EVENT, h);
    }, [nodeId]);

    return {
        handleDelete, handleRegenerate, handleConnectClick, handleTransform,
        handleHeadingChange, handleCopy, handleTagsChange, isTransforming,
    };
}
