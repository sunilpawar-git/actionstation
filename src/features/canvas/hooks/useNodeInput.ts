import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useNodeData } from './useNodeData';
import { useLinkPreviewFetch } from './useLinkPreviewFetch';
import { extractUrls } from './nodeInputUtils';
import { getViewModeKeyAction, applyViewModeKeyAction } from './nodeInputKeyHandler';
import { useSubmitHandlerEffect, usePasteHandlerEffect } from './nodeInputEffects';
import type { UseNodeInputOptions, UseNodeInputReturn } from './useNodeInput.types';

export type { NodeShortcutMap } from './nodeInputKeyHandler';
export type { UseNodeInputOptions, UseNodeInputReturn } from './useNodeInput.types';
export { extractUrls };

export function useNodeInput(options: UseNodeInputOptions): UseNodeInputReturn {
    const {
        nodeId, isEditing, editor, getMarkdown, setContent,
        getEditableContent, saveContent, submitHandlerRef,
        isGenerating, isNewEmptyNode, focusHeading, shortcuts,
    } = options;

    const draftContentStore = useCanvasStore((s) => s.draftContent);
    const draftContent = isEditing ? draftContentStore : null;
    const nodeData = useNodeData(nodeId);
    const nodeOutput = nodeData?.output;
    const detectedUrls = useMemo(
        () => extractUrls(isEditing ? draftContent : (nodeOutput ?? null)),
        [isEditing, draftContent, nodeOutput],
    );
    useLinkPreviewFetch(nodeId, detectedUrls);

    const enterEditing = useCallback(() => {
        setContent(getEditableContent());
        useCanvasStore.getState().startEditing(nodeId);
        editor?.setEditable(true);
    }, [nodeId, editor, setContent, getEditableContent]);

    const exitEditing = useCallback(() => {
        saveContent(getMarkdown());
        editor?.setEditable(false);
        useCanvasStore.getState().stopEditing();
    }, [saveContent, getMarkdown, editor]);

    const autoEditRef = useRef(isNewEmptyNode);
    useEffect(() => {
        if (!autoEditRef.current || !editor) return;
        autoEditRef.current = false;
        enterEditing();
        queueMicrotask(() => (focusHeading ?? editor.commands.focus)());
    }, [editor, enterEditing, focusHeading]);

    useSubmitHandlerEffect(submitHandlerRef, exitEditing);
    usePasteHandlerEffect(isEditing, editor, getMarkdown);

    const handleViewModeKey = useCallback((e: KeyboardEvent) => {
        if (isGenerating) return;
        applyViewModeKeyAction(getViewModeKeyAction(e, shortcuts), e, { enterEditing, editor });
    }, [isGenerating, enterEditing, editor, shortcuts]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isEditing) handleViewModeKey(e);
    }, [isEditing, handleViewModeKey]);

    const handleDoubleClick = useCallback(() => {
        if (!isGenerating) enterEditing();
    }, [isGenerating, enterEditing]);

    return { handleKeyDown, handleDoubleClick };
}
