import { useCallback, useMemo } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { enterFocusWithEditing } from '../stores/focusStore';
import { useIdeaCardActions } from './useIdeaCardActions';
import { useIdeaCardDuplicateAction } from './useIdeaCardDuplicateAction';
import { useIdeaCardShareAction } from './useIdeaCardShareAction';
import { useIdeaCardImageHandlers } from './useIdeaCardImageHandlers';
import { useNodeInput, type NodeShortcutMap } from './useNodeInput';
import { useNodeShortcuts } from './useNodeShortcuts';
import { deleteNodeAttachments } from '../services/documentUploadService';
import { captureError } from '@/shared/services/sentryService';
import type { UseIdeaCardHandlersParams, NodeColorKey } from './useIdeaCardHandlers.types';

export function useIdeaCardHandlers(params: UseIdeaCardHandlersParams) {
    const { id, selected, setShowTagInput, contentRef, headingRef, editor, getMarkdown, setContent,
        getEditableContent, saveContent, submitHandlerRef, imageUploadFn,
        generateFromPrompt, branchFromNode, calendar, resolvedData, isEditing, onSubmitAI } = params;
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- legacy field, heading is SSOT
    const { prompt = '', output, isGenerating } = resolvedData;

    const { slashHandler, handleImageClick, handleAttachmentClick, documentInsertFn, handleAfterImageInsert } = useIdeaCardImageHandlers({ id, editor, getMarkdown, imageUploadFn });

    const { handleDelete: rawDelete, handleRegenerate, handleConnectClick, handleTransform,
        handleHeadingChange, handleCopy, handleTagsChange, isTransforming } = useIdeaCardActions({
        nodeId: id, getEditableContent, contentRef, generateFromPrompt, branchFromNode,
    });
    const { handleDuplicate } = useIdeaCardDuplicateAction(id);
    const { handleShare, isSharing } = useIdeaCardShareAction(id);
    const handleDelete = useCallback(() => {
        calendar.cleanupOnDelete();
        // Read attachments fresh from the store (resolvedData may be a stale prop snapshot).
        const freshAttachments = useCanvasStore.getState().nodes.find((n) => n.id === id)?.data.attachments;
        if (freshAttachments && freshAttachments.length > 0) void deleteNodeAttachments(freshAttachments).catch((e: unknown) => captureError(e as Error));
        rawDelete();
    }, [calendar, id, rawDelete]);

    const handlePinToggle = useCallback(() => { useCanvasStore.getState().toggleNodePinned(id); }, [id]);
    const handleCollapseToggle = useCallback(() => { useCanvasStore.getState().toggleNodeCollapsed(id); }, [id]);
    const handlePoolToggle = useCallback(() => { useCanvasStore.getState().toggleNodePoolMembership(id); }, [id]);
    const handleColorChange = useCallback((colorKey: NodeColorKey) => {
        useCanvasStore.getState().updateNodeColor(id, colorKey);
    }, [id]);
    const handleTagOpen = useCallback(() => { setShowTagInput(true); }, [setShowTagInput]);
    const handleFocusClick = useCallback(() => { enterFocusWithEditing(id); }, [id]);

    const focusBody = useCallback(() => { if (editor) editor.commands.focus(); }, [editor]);
    const focusHeading = useCallback(() => { headingRef.current?.focus(); }, [headingRef]);
    const nodeShortcuts: NodeShortcutMap = useMemo(() => ({
        t: handleTagOpen, c: handleCollapseToggle, f: handleFocusClick,
    }), [handleTagOpen, handleCollapseToggle, handleFocusClick]);
    useNodeShortcuts(selected ?? false, nodeShortcuts);

    const { handleKeyDown, handleDoubleClick } = useNodeInput({
        nodeId: id, isEditing, editor, getMarkdown, setContent, getEditableContent, saveContent,
        submitHandlerRef, isGenerating: Boolean(isGenerating),
        isNewEmptyNode: !prompt && !output, focusHeading, shortcuts: nodeShortcuts,
    });

    const onTagsChange = useCallback((ids: string[]) => {
        handleTagsChange(ids);
        if (ids.length === 0) setShowTagInput(false);
    }, [handleTagsChange, setShowTagInput]);
    const onKeyDownReact = useCallback((e: React.KeyboardEvent) => handleKeyDown(e.nativeEvent), [handleKeyDown]);

    return {
        slashHandler, handleImageClick, handleAttachmentClick, documentInsertFn, handleAfterImageInsert, handleDelete, handleRegenerate,
        handleConnectClick, handleTransform, handleHeadingChange, handleCopy, handleDuplicate,
        handleShare, isSharing, isTransforming, handlePinToggle, handleCollapseToggle,
        handlePoolToggle, handleColorChange, handleTagOpen, handleFocusClick, handleDoubleClick,
        onSubmitAI, onTagsChange, onKeyDownReact, focusBody,
    };
}
