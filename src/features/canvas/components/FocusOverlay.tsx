/**
 * FocusOverlay - Centered panel overlay for focused node editing
 * Renders via portal to escape ReactFlow transform context.
 * Reuses NodeHeading and TagInput for consistent editing UX.
 * ViewModel logic extracted to useFocusOverlayActions.
 */
import React, { useCallback, useMemo, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import { getPortalRoot } from '@/shared/utils/portalRoot';
import { useFocusMode } from '../hooks/useFocusMode';
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
import styles from './FocusOverlay.module.css';
import colorStyles from './nodes/nodeColorStyles.module.css';

const LazyMindmapRenderer = React.lazy(() =>
    import('./nodes/MindmapRenderer').then((m) => ({ default: m.MindmapRenderer })),
);

function useFocusOverlayDerived() {
    const { focusedNode, isFocused, exitFocus } = useFocusMode();
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
    return { focusedNode, isFocused, exitFocus, nodeId, heading, output, tagIds, linkPreviews, colorKey, contentMode, isEditing, showMindmap, showMindmapEmpty };
}

export const FocusOverlay = React.memo(function FocusOverlay() {
    const { focusedNode, isFocused, exitFocus, nodeId, heading, output, tagIds, linkPreviews, colorKey, contentMode, isEditing, showMindmap, showMindmapEmpty } = useFocusOverlayDerived();

    const headingRef = useRef<NodeHeadingHandle>(null);
    const getHeading = useCallback(
        () => headingRef.current?.getHeading() ?? heading,
        // heading is the fallback when the ref isn't populated yet
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const { editor, handleDoubleClick: rawDoubleClick, handleHeadingChange, handleTagsChange, saveBeforeExit } =
        useFocusOverlayActions({ nodeId, output, isEditing, onExit: exitFocus, getHeading });

    const handleDoubleClick = useCallback(() => {
        if (!isContentModeMindmap(contentMode)) rawDoubleClick();
    }, [contentMode, rawDoubleClick]);

    const handleExit = useCallback(() => { saveBeforeExit(); exitFocus(); }, [saveBeforeExit, exitFocus]);

    const handlePanelClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); }, []);
    const handleSwitchToText = useCallback(() => {
        if (nodeId) void toggleContentModeWithUndo(nodeId).catch(() => undefined);
    }, [nodeId]);

    if (!isFocused || !focusedNode) return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={strings.nodeUtils.focus}
            data-testid="focus-backdrop"
            className={styles.backdrop}
            onClick={handleExit}
        >
            <div data-testid="focus-panel" data-color={colorKey}
                className={`${styles.panel} ${colorStyles.colorContainer} ${showMindmap ? styles.panelMindmap : ''}`} onClick={handlePanelClick}>
                <button
                    data-testid="focus-close-button"
                    className={styles.closeButton}
                    onClick={handleExit}
                    aria-label={strings.nodeUtils.exitFocus}
                >
                    {strings.common.closeSymbol}
                </button>
                <div className={styles.headingSection}>
                    <NodeHeading
                        ref={headingRef}
                        heading={heading}
                        isEditing={isEditing}
                        onHeadingChange={handleHeadingChange}
                        onDoubleClick={handleDoubleClick}
                    />
                </div>
                <div className={styles.divider} />
                <div className={`${styles.contentArea} ${showMindmap ? styles.contentAreaMindmap : ''}`}
                    data-testid="focus-content-area"
                    onDoubleClick={!isEditing ? handleDoubleClick : undefined}>
                    {showMindmap ? (
                        <div className={styles.mindmapWrapper}>
                            <MindmapErrorBoundary onSwitchToText={handleSwitchToText}>
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
                    <LinkPreviewList previews={linkPreviews ?? {}} />
                </div>
                {tagIds.length > 0 && (
                    <div className={styles.tagsSection}>
                        <TagInput selectedTagIds={tagIds} onChange={handleTagsChange} compact />
                    </div>
                )}
            </div>
        </div>,
        getPortalRoot(),
    );
});
