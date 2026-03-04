/** IdeaCard - Unified note/AI card component. Orchestrates editor, keyboard, and UI state via useNodeInput (SSOT) */
import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useIdeaCard } from '../../hooks/useIdeaCard';
import { NodeUtilsBar } from './NodeUtilsBar';
import { NodeResizeButtons } from './NodeResizeButtons';
import { IdeaCardHeadingSection } from './IdeaCardHeadingSection';
import { IdeaCardContentSection } from './IdeaCardContentSection';
import { IdeaCardTagsSection } from './IdeaCardTagsSection';
import { IdeaCardUploadOverlay } from './IdeaCardUploadOverlay';
import { MIN_NODE_WIDTH, MAX_NODE_WIDTH, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT, normalizeNodeColorKey, type IdeaNodeData } from '../../types/node';
import { MemoryChipIcon } from '@/shared/components/icons';
import { strings } from '@/shared/localization/strings';
import styles from './IdeaCard.module.css';
import colorStyles from './nodeColorStyles.module.css';
import handleStyles from './IdeaCardHandles.module.css';
import './NodeImage.module.css';

export const IdeaCard = React.memo(({ id, data: rfData, selected }: NodeProps) => {
    const api = useIdeaCard({ id, rfData: rfData as unknown as IdeaNodeData, selected });
    const {
        resolvedData, heading, prompt, isGenerating, isPinned, isCollapsed, tagIds, linkPreviews, calendarEvent,
        isAICard, showTagInput, contentRef, cardWrapperRef, barContainerRef, headingRef,
        pinOpenHandlers, editor, handleDoubleClick, handleDelete, handleRegenerate, handleConnectClick,
        handleTransform, handleHeadingChange, handleCopy, handleDuplicate, handleShare,
        isSharing, isTransforming, handlePinToggle, handleCollapseToggle, handlePoolToggle, handleColorChange,
        handleTagOpen, handleFocusClick, handleImageClick, handleAttachmentClick, slashHandler, onSubmitAI, onTagsChange, onKeyDownReact,
        hasContent, isEditing, isPinnedOpen, calendar, focusBody, registerProximityLostFn,
    } = api;
    const nodeColorKey = normalizeNodeColorKey(resolvedData.colorKey);

    return (
        <div ref={cardWrapperRef}
            className={`${styles.cardWrapper} ${handleStyles.resizerWrapper} ${isCollapsed ? styles.cardWrapperCollapsed : ''} ${isPinned ? 'nodrag' : ''}`}
            onContextMenu={pinOpenHandlers.onContextMenu}
            onTouchStart={pinOpenHandlers.onTouchStart} onTouchEnd={pinOpenHandlers.onTouchEnd}>
            <NodeResizer minWidth={MIN_NODE_WIDTH} maxWidth={MAX_NODE_WIDTH}
                minHeight={MIN_NODE_HEIGHT} maxHeight={MAX_NODE_HEIGHT} isVisible={selected && !isCollapsed} />
            <NodeResizeButtons nodeId={id} />
            <Handle type="target" position={Position.Top} id={`${id}-target`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleTop}`} />
            <div className={`${styles.ideaCard} ${colorStyles.colorContainer} ${isCollapsed ? styles.collapsed : ''}`}
                data-color={nodeColorKey}>
                <IdeaCardUploadOverlay visible={api.isDocumentUploading} />
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
                        linkPreviews={linkPreviews} />
                )}
                <IdeaCardTagsSection tagIds={tagIds} onChange={onTagsChange}
                    visible={!isCollapsed && (showTagInput || tagIds.length > 0)} />
            </div>
            <NodeUtilsBar ref={barContainerRef}
                registerProximityLostFn={registerProximityLostFn}
                onTagClick={handleTagOpen} onImageClick={handleImageClick}
                onAttachmentClick={handleAttachmentClick}
                onConnectClick={handleConnectClick}
                onCopyClick={handleCopy} onDuplicateClick={handleDuplicate}
                onShareClick={handleShare} isSharing={isSharing}
                onFocusClick={handleFocusClick}
                onDelete={handleDelete} onTransform={handleTransform}
                onRegenerate={handleRegenerate} onPinToggle={handlePinToggle}
                onColorChange={handleColorChange} nodeColorKey={nodeColorKey}
                onCollapseToggle={handleCollapseToggle} onPoolToggle={handlePoolToggle}
                isInPool={resolvedData.includeInAIPool ?? false}
                hasContent={hasContent}
                isTransforming={isTransforming} isPinned={isPinned ?? false}
                isCollapsed={isCollapsed ?? false} disabled={isGenerating ?? false}
                isPinnedOpen={isPinnedOpen} />
            <Handle type="source" position={Position.Bottom} id={`${id}-source`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleBottom}`} />
        </div>
    );
});
