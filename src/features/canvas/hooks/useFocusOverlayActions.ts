/**
 * useFocusOverlayActions — ViewModel logic for FocusOverlay
 * Extracts editing lifecycle, content save, ESC handling, and heading/tag handlers
 * so FocusOverlay stays under component line limits.
 *
 * Note: startEditing is handled by enterFocusWithEditing (single call site).
 * No useEffect needed here — avoids race condition with IdeaCard blur handlers.
 */
import { useCallback, useEffect } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { strings } from '@/shared/localization/strings';
import { useIdeaCardEditor } from './useIdeaCardEditor';

interface UseFocusOverlayActionsOptions {
    nodeId: string;
    output: string | undefined;
    isEditing: boolean;
    onExit: () => void;
    /** Returns the current (possibly uncommitted) heading text from the heading editor. */
    getHeading?: () => string;
}

export function useFocusOverlayActions({ nodeId, output, isEditing, onExit, getHeading }: UseFocusOverlayActionsOptions) {
    const handleDoubleClick = useCallback(() => {
        if (!nodeId) return;
        useCanvasStore.getState().startEditing(nodeId);
    }, [nodeId]);

    const handleHeadingChange = useCallback((h: string) => {
        if (!nodeId) return;
        useCanvasStore.getState().updateNodeHeading(nodeId, h);
    }, [nodeId]);

    const handleTagsChange = useCallback((ids: string[]) => {
        if (!nodeId) return;
        useCanvasStore.getState().updateNodeTags(nodeId, ids);
    }, [nodeId]);

    const saveContent = useCallback((markdown: string) => {
        if (!nodeId) return;
        useCanvasStore.getState().updateNodeOutput(nodeId, markdown);
    }, [nodeId]);

    const getEditableContent = useCallback(() => output ?? '', [output]);

    const { editor, getMarkdown, submitHandlerRef } = useIdeaCardEditor({
        isEditing,
        output,
        getEditableContent,
        placeholder: strings.ideaCard.inputPlaceholder,
        saveContent,
        // In focus mode, blur saves content but does NOT exit editing.
        // Editing stays alive until explicit exit (close button / backdrop / ESC).
        onExitEditing: useCallback(() => { /* no-op — kept alive by focus mode */ }, []),
    });

    const saveBeforeExit = useCallback(() => {
        if (!nodeId) return;
        if (getHeading) handleHeadingChange(getHeading());
        saveContent(getMarkdown());
        useCanvasStore.getState().stopEditing();
    }, [nodeId, getHeading, handleHeadingChange, getMarkdown, saveContent]);

    useEffect(() => {
        submitHandlerRef.current = {
            onEnter: () => false,
            onEscape: () => {
                saveBeforeExit();
                onExit();
                return true;
            },
        };
        return () => { submitHandlerRef.current = null; };
        // submitHandlerRef is stable; omit from deps to avoid unnecessary effect re-runs
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saveBeforeExit, onExit]);

    return { editor, handleDoubleClick, handleHeadingChange, handleTagsChange, saveBeforeExit };
}
