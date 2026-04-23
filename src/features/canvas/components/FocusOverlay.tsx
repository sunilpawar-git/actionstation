/**
 * FocusOverlay - Centered panel overlay for focused node editing
 * Renders via portal to escape ReactFlow transform context.
 * Reuses NodeHeading and TagInput for consistent editing UX.
 * ViewModel logic extracted to useFocusOverlayActions.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import { getPortalRoot } from '@/shared/utils/portalRoot';
import { useFocusMode } from '../hooks/useFocusMode';
import { useCanvasStore } from '../stores/canvasStore';
import { useFocusOverlayActions } from '../hooks/useFocusOverlayActions';
import { normalizeNodeColorKey } from '../types/node';
import { isContentModeMindmap } from '../types/contentMode';
import { toggleContentModeWithUndo } from '../services/contentModeToggleService';
import { type NodeHeadingHandle } from './nodes/NodeHeading';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import { FocusOverlayPanel } from './FocusOverlayPanel';
import './FocusOverlay.css';

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
    const isEditing = useMemo(() => editingNodeId === nodeId && nodeId !== '', [editingNodeId, nodeId]);
    const hasMindmapContent = Boolean(output?.trim());
    const showMindmap = isContentModeMindmap(contentMode) && !isEditing && hasMindmapContent;
    const showMindmapEmpty = isContentModeMindmap(contentMode) && !isEditing && !hasMindmapContent;
    return { focusedNode, isFocused, exitFocus, nodeId, heading, output, tagIds, linkPreviews, colorKey, contentMode, isEditing, showMindmap, showMindmapEmpty };
}

export const FocusOverlay = React.memo(function FocusOverlay() {
    const { focusedNode, isFocused, exitFocus, nodeId, heading, output, tagIds, linkPreviews, colorKey, contentMode, isEditing, showMindmap, showMindmapEmpty } = useFocusOverlayDerived();
    const headingRef = useRef<NodeHeadingHandle>(null);
    const focusTrapRef = useRef<HTMLDivElement>(null);
    useFocusTrap(focusTrapRef, isFocused);

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
        <div role="dialog" aria-modal="true" aria-label={strings.nodeUtils.focus}
            data-testid="focus-backdrop"
            className="fixed inset-0 flex items-center justify-center z-[var(--z-modal)] focus-overlay-backdrop"
            style={{ background: 'var(--focus-backdrop-bg)' }} onClick={handleExit}>
            <FocusOverlayPanel focusTrapRef={focusTrapRef} headingRef={headingRef} colorKey={colorKey}
                heading={heading} output={output} tagIds={tagIds} linkPreviews={linkPreviews}
                isEditing={isEditing} showMindmap={showMindmap}
                showMindmapEmpty={showMindmapEmpty} editor={editor}
                onPanelClick={handlePanelClick} onExit={handleExit}
                onHeadingChange={handleHeadingChange} onDoubleClick={handleDoubleClick}
                onTagsChange={handleTagsChange} onSwitchToText={handleSwitchToText} />
        </div>,
        getPortalRoot(),
    );
});
