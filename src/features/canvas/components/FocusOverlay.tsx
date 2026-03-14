/**
 * FocusOverlay - Centered panel overlay for focused node editing
 * Renders via portal to escape ReactFlow transform context.
 * Reuses NodeHeading and TagInput for consistent editing UX.
 * ViewModel logic extracted to useFocusOverlayActions.
 *
 * Phase 11: Branches to ReaderShell when readerContext is set.
 */
import React, { useCallback, useMemo, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import { getPortalRoot } from '@/shared/utils/portalRoot';
import { useFocusMode } from '../hooks/useFocusMode';
import { useFocusStore } from '../stores/focusStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useFocusOverlayActions } from '../hooks/useFocusOverlayActions';
import { normalizeNodeColorKey } from '../types/node';
import { isContentModeMindmap } from '../types/contentMode';
import { toggleContentModeWithUndo } from '../services/contentModeToggleService';
import { NodeHeading, type NodeHeadingHandle } from './nodes/NodeHeading';
import { TagInput } from '@/features/tags';
import { TipTapEditor } from './nodes/TipTapEditor';
import { LinkPreviewList } from './nodes/LinkPreviewCard';
import { MindmapErrorBoundary } from './nodes/MindmapErrorBoundary';
import { ReaderShell } from '@/features/reader/components/ReaderShell';
import { resolveReaderSource } from '@/features/reader/services/resolveReaderSource';
import { useOpenArticle } from '@/features/reader/hooks/useOpenArticle';
import styles from './FocusOverlay.module.css';
import colorStyles from './nodes/nodeColorStyles.module.css';

const LazyMindmapRenderer = React.lazy(() =>
    import('./nodes/MindmapRenderer').then((m) => ({ default: m.MindmapRenderer })),
);

function useFocusOverlayDerived() {
    const { focusedNode, isFocused, exitFocus, readerContext, closeReader } = useFocusMode();
    const nodeId = focusedNode?.id ?? '';
    const heading = focusedNode?.data.heading ?? '';
    const output = focusedNode?.data.output;
    const tagIds = focusedNode?.data.tags ?? [];
    const linkPreviews = focusedNode?.data.linkPreviews;
    const colorKey = normalizeNodeColorKey(focusedNode?.data.colorKey);
    const contentMode = focusedNode?.data.contentMode;
    const editingNodeId = useCanvasStore((s) => s.editingNodeId);
    const isEditing = useMemo(
        () => editingNodeId === nodeId && nodeId !== '',
        [editingNodeId, nodeId],
    );
    const hasMindmapContent = Boolean(output?.trim());
    const showMindmap = isContentModeMindmap(contentMode) && !isEditing && hasMindmapContent;
    const showMindmapEmpty = isContentModeMindmap(contentMode) && !isEditing && !hasMindmapContent;
    return {
        focusedNode, isFocused, exitFocus, readerContext, closeReader,
        nodeId, heading, output, tagIds, linkPreviews, colorKey,
        contentMode, isEditing, showMindmap, showMindmapEmpty,
    };
}

export const FocusOverlay = React.memo(function FocusOverlay() {
    const derived = useFocusOverlayDerived();
    const { focusedNode, isFocused, exitFocus, readerContext, closeReader,
        nodeId, heading, output, tagIds, linkPreviews, colorKey,
        contentMode, isEditing, showMindmap, showMindmapEmpty } = derived;

    const headingRef = useRef<NodeHeadingHandle>(null);
    const getHeading = useCallback(
        () => headingRef.current?.getHeading() ?? heading,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const handleOpenReader = useCallback((nId: string, url: string, filename: string, mimeType: string) => {
        const source = resolveReaderSource({ url, filename, mimeType });
        if (source) useFocusStore.getState().openReader(nId, source);
    }, []);
    const handleOpenArticle = useOpenArticle(nodeId);

    const { editor, handleDoubleClick: rawDoubleClick, handleHeadingChange, handleTagsChange, saveBeforeExit } =
        useFocusOverlayActions({ nodeId, output, isEditing, onExit: exitFocus, getHeading, onOpenReader: handleOpenReader });

    const handleDoubleClick = useCallback(() => {
        if (!isContentModeMindmap(contentMode)) rawDoubleClick();
    }, [contentMode, rawDoubleClick]);

    const handleExit = useCallback(() => { saveBeforeExit(); exitFocus(); }, [saveBeforeExit, exitFocus]);

    const handlePanelClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); }, []);
    const handleSwitchToText = useCallback(() => {
        if (nodeId) void toggleContentModeWithUndo(nodeId).catch(() => undefined);
    }, [nodeId]);

    if (!isFocused || !focusedNode) return null;

    const isReaderMode = readerContext !== null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={isReaderMode ? strings.reader.readerPanel : strings.nodeUtils.focus}
            data-testid="focus-backdrop"
            className={styles.backdrop}
            onClick={handleExit}
        >
            <div data-testid="focus-panel" data-color={colorKey}
                className={`${styles.panel} ${colorStyles.colorContainer} ${isReaderMode ? styles.panelReader : ''} ${showMindmap ? styles.panelMindmap : ''}`}
                onClick={handlePanelClick}>

                {isReaderMode ? (
                    <ReaderShell
                        source={readerContext.source}
                        sessionId={readerContext.sessionId}
                        editor={editor}
                        isEditing={isEditing}
                        nodeId={nodeId}
                        onClose={closeReader}
                    />
                ) : (
                    <FocusEditorContent
                        headingRef={headingRef}
                        heading={heading}
                        isEditing={isEditing}
                        output={output}
                        editor={editor}
                        contentMode={contentMode}
                        showMindmap={showMindmap}
                        showMindmapEmpty={showMindmapEmpty}
                        linkPreviews={linkPreviews}
                        tagIds={tagIds}
                        onHeadingChange={handleHeadingChange}
                        onDoubleClick={handleDoubleClick}
                        onTagsChange={handleTagsChange}
                        onSwitchToText={handleSwitchToText}
                        onExit={handleExit}
                        onOpenInReader={handleOpenArticle}
                    />
                )}
            </div>
        </div>,
        getPortalRoot(),
    );
});

interface FocusEditorContentProps {
    headingRef: React.Ref<NodeHeadingHandle>;
    heading: string;
    isEditing: boolean;
    output: string | undefined;
    editor: ReturnType<typeof useFocusOverlayActions>['editor'];
    contentMode: string | undefined;
    showMindmap: boolean;
    showMindmapEmpty: boolean;
    linkPreviews: Record<string, unknown> | undefined;
    tagIds: string[];
    onHeadingChange: (h: string) => void;
    onDoubleClick: () => void;
    onTagsChange: (ids: string[]) => void;
    onSwitchToText: () => void;
    onExit: () => void;
    onOpenInReader?: (url: string) => void;
}

const FocusEditorContent = React.memo(function FocusEditorContent({
    headingRef, heading, isEditing, output, editor,
    showMindmap, showMindmapEmpty, linkPreviews, tagIds,
    onHeadingChange, onDoubleClick, onTagsChange, onSwitchToText, onExit,
    onOpenInReader,
}: FocusEditorContentProps) {
    return (
        <>
            <button
                data-testid="focus-close-button"
                className={styles.closeButton}
                onClick={onExit}
                aria-label={strings.nodeUtils.exitFocus}
            >
                {strings.common.closeSymbol}
            </button>
            <div className={styles.headingSection}>
                <NodeHeading
                    ref={headingRef}
                    heading={heading}
                    isEditing={isEditing}
                    onHeadingChange={onHeadingChange}
                    onDoubleClick={onDoubleClick}
                />
            </div>
            <div className={styles.divider} />
            <div className={`${styles.contentArea} ${showMindmap ? styles.contentAreaMindmap : ''}`}
                data-testid="focus-content-area"
                onDoubleClick={!isEditing ? onDoubleClick : undefined}>
                {showMindmap ? (
                    <div className={styles.mindmapWrapper}>
                        <MindmapErrorBoundary onSwitchToText={onSwitchToText}>
                            <Suspense fallback={<div className={styles.mindmapLoading}>{strings.canvas.mindmap.loading}</div>}>
                                <LazyMindmapRenderer markdown={output ?? ''} disableZoom={false} />
                            </Suspense>
                        </MindmapErrorBoundary>
                    </div>
                ) : null}
                {showMindmapEmpty ? (
                    <div className={styles.mindmapEmptyState} data-testid="mindmap-empty-state">
                        <span className={styles.mindmapEmptyIcon}>🧠</span>
                        <p>{strings.canvas.mindmap.emptyHint}</p>
                    </div>
                ) : null}
                <div style={showMindmap ? { display: 'none' } : undefined}>
                    <TipTapEditor editor={editor} isEditable={isEditing} data-testid="focus-editor" />
                </div>
                <LinkPreviewList previews={(linkPreviews ?? {}) as Record<string, never>}
                    onOpenInReader={onOpenInReader} />
            </div>
            {tagIds.length > 0 && (
                <div className={styles.tagsSection}>
                    <TagInput selectedTagIds={tagIds} onChange={onTagsChange} compact />
                </div>
            )}
        </>
    );
});
