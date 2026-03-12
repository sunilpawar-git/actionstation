/** IdeaCard - Unified note/AI card component. Orchestrates editor, keyboard, and UI state via useNodeInput (SSOT) */
import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useIdeaCard } from '../../hooks/useIdeaCard';
import { useNodeContextMenu } from './useNodeContextMenu';
import { NodeUtilsBar } from './NodeUtilsBar';
import { IdeaCardContextMenuSection } from './IdeaCardContextMenuSection';
import { NodeResizeButtons } from './NodeResizeButtons';
import { IdeaCardHeadingSection } from './IdeaCardHeadingSection';
import { IdeaCardContentSection } from './IdeaCardContentSection';
import { IdeaCardTagsSection } from './IdeaCardTagsSection';
import { MIN_NODE_WIDTH, MAX_NODE_WIDTH, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT, MINDMAP_MIN_WIDTH, MINDMAP_MIN_HEIGHT, normalizeNodeColorKey, type IdeaNodeData } from '../../types/node';
import { isContentModeMindmap } from '../../types/contentMode';
import { toggleContentModeWithUndo, convertToMindmapWithAI } from '../../services/contentModeToggleService';
import { MemoryChipIcon } from '@/shared/components/icons';
import { captureError } from '@/shared/services/sentryService';
import { strings } from '@/shared/localization/strings';
import { SynthesisFooterWrapper } from '@/features/synthesis/components/SynthesisFooterWrapper';
import styles from './IdeaCard.module.css';
import colorStyles from './nodeColorStyles.module.css';
import handleStyles from './IdeaCardHandles.module.css';
import './NodeImage.module.css';

const RF_NO_DRAG = 'nodrag';

export const IdeaCard = React.memo(function IdeaCard({ id, data: rfData, selected }: NodeProps) {
    const api = useIdeaCard({ id, rfData: rfData as unknown as IdeaNodeData, selected });
    const {
        resolvedData, heading, prompt, isGenerating, isPinned, isCollapsed, tagIds, linkPreviews, calendarEvent,
        isAICard, showTagInput, contentRef, cardWrapperRef, barContainerRef, headingRef,
        editor, handleDoubleClick, handleDelete, handleRegenerate, handleConnectClick,
        handleTransform, handleHeadingChange, handleCopy, handleDuplicate, handleShare,
        isSharing, isTransforming, handlePinToggle, handleCollapseToggle, handlePoolToggle, handleColorChange,
        handleTagOpen, handleFocusClick, handleImageClick, handleAttachmentClick, slashHandler, onSubmitAI, onTagsChange, onKeyDownReact,
        hasContent, isEditing, calendar, focusBody, registerProximityLostFn,
    } = api;
    const nodeColorKey = normalizeNodeColorKey(resolvedData.colorKey);
    const isSynthesisNode = nodeColorKey === 'synthesis';
    const contextMenu = useNodeContextMenu();
    const { openAtElement } = contextMenu;

    const handleMoreClick = React.useCallback(() => {
        if (barContainerRef.current) openAtElement(barContainerRef.current);
    }, [barContainerRef, openAtElement]);

    const handleContentModeToggle = React.useCallback(() => {
        toggleContentModeWithUndo(id);
    }, [id]);

    const handleConvertToMindmap = React.useCallback(() => {
        void convertToMindmapWithAI(id).catch((e: unknown) => captureError(e as Error));
    }, [id]);

    return (
        <div ref={cardWrapperRef}
            className={`${styles.cardWrapper} ${handleStyles.resizerWrapper} ${isCollapsed ? styles.cardWrapperCollapsed : ''} ${isPinned ? RF_NO_DRAG : ''}`}
            onContextMenu={contextMenu.openAtCursor}
            onTouchStart={contextMenu.onTouchStart} onTouchMove={contextMenu.onTouchMove}
            onTouchEnd={contextMenu.onTouchEnd}>
            <NodeResizer
                minWidth={isContentModeMindmap(resolvedData.contentMode) ? MINDMAP_MIN_WIDTH : MIN_NODE_WIDTH}
                maxWidth={MAX_NODE_WIDTH}
                minHeight={isContentModeMindmap(resolvedData.contentMode) ? MINDMAP_MIN_HEIGHT : MIN_NODE_HEIGHT}
                maxHeight={MAX_NODE_HEIGHT}
                isVisible={selected && !isCollapsed} />
            <NodeResizeButtons nodeId={id} />
            <Handle type="target" position={Position.Top} id={`${id}-target`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleTop}`} />
            <div className={`${styles.ideaCard} ${colorStyles.colorContainer} ${isCollapsed ? styles.collapsed : ''}`}
                data-color={nodeColorKey} data-node-section="card">
                {resolvedData.includeInAIPool && (
                    <span className={styles.poolBadge} aria-label={strings.nodePool.inPool}>
                        <MemoryChipIcon size={10} filled />
                    </span>
                )}
                <IdeaCardHeadingSection headingRef={headingRef} heading={heading ?? ''} isEditing={isEditing}
                    onHeadingChange={handleHeadingChange} onEnterKey={focusBody}
                    onDoubleClick={handleDoubleClick} onSlashCommand={slashHandler}
                    onSubmitAI={onSubmitAI} calendarEvent={calendarEvent}
                    onCalendarRetry={calendar.handleRetry} isCollapsed={isCollapsed ?? false} />
                {!isCollapsed && (
                    <IdeaCardContentSection contentRef={contentRef} selected={selected}
                        isEditing={isEditing} onKeyDown={onKeyDownReact}
                        isGenerating={isGenerating ?? false} hasContent={hasContent}
                        isAICard={isAICard} heading={heading} prompt={prompt}
                        editor={editor} handleDoubleClick={handleDoubleClick}
                        linkPreviews={linkPreviews}
                        contentMode={resolvedData.contentMode}
                        output={resolvedData.output}
                        onContentModeToggle={handleContentModeToggle} />
                )}
                <IdeaCardTagsSection tagIds={tagIds} onChange={onTagsChange}
                    visible={!isCollapsed && (showTagInput || tagIds.length > 0)} />
                {isSynthesisNode && !isCollapsed && <SynthesisFooterWrapper nodeId={id} />}
            </div>
            <NodeUtilsBar ref={barContainerRef} registerProximityLostFn={registerProximityLostFn}
                onConnectClick={handleConnectClick} onCopyClick={handleCopy}
                onDelete={handleDelete} onTransform={handleTransform} onRegenerate={handleRegenerate}
                hasContent={hasContent} isTransforming={isTransforming} disabled={isGenerating ?? false}
                onMoreClick={handleMoreClick} onAIClick={handleDoubleClick} />
            {contextMenu.isOpen && contextMenu.position && (
                <IdeaCardContextMenuSection nodeId={id} position={contextMenu.position} onClose={contextMenu.close}
                    onTagClick={handleTagOpen} onImageClick={handleImageClick} onAttachmentClick={handleAttachmentClick}
                    onFocusClick={handleFocusClick} onDuplicateClick={handleDuplicate} onShareClick={handleShare}
                    isSharing={isSharing} onPinToggle={handlePinToggle} onCollapseToggle={handleCollapseToggle}
                    onPoolToggle={handlePoolToggle} onColorChange={handleColorChange} nodeColorKey={nodeColorKey}
                    isPinned={isPinned ?? false} isCollapsed={isCollapsed ?? false}
                    isInPool={resolvedData.includeInAIPool ?? false}
                    onContentModeToggle={handleContentModeToggle}
                    onConvertToMindmap={handleConvertToMindmap}
                    hasContent={hasContent}
                    isMindmapMode={isContentModeMindmap(resolvedData.contentMode)} />
            )}
            <Handle type="source" position={Position.Bottom} id={`${id}-source`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleBottom}`} />
        </div>
    );
});
