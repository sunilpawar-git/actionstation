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
import { MIN_NODE_WIDTH, MAX_NODE_WIDTH, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT, normalizeNodeColorKey, type IdeaNodeData } from '../../types/node';
import { MemoryChipIcon } from '@/shared/components/icons';
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

    return (
        <div ref={cardWrapperRef}
            className={`${styles.cardWrapper} ${handleStyles.resizerWrapper} ${isCollapsed ? styles.cardWrapperCollapsed : ''} ${isPinned ? RF_NO_DRAG : ''}`}
            onContextMenu={contextMenu.openAtCursor}
            onTouchStart={contextMenu.onTouchStart} onTouchMove={contextMenu.onTouchMove}
            onTouchEnd={contextMenu.onTouchEnd}>
            <NodeResizer minWidth={MIN_NODE_WIDTH} maxWidth={MAX_NODE_WIDTH}
                minHeight={MIN_NODE_HEIGHT} maxHeight={MAX_NODE_HEIGHT} isVisible={selected && !isCollapsed} />
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
                        linkPreviews={linkPreviews} />
                )}
                <IdeaCardTagsSection tagIds={tagIds} onChange={onTagsChange}
                    visible={!isCollapsed && (showTagInput || tagIds.length > 0)} />
                {isSynthesisNode && !isCollapsed && <SynthesisFooterWrapper nodeId={id} />}
            </div>
            <NodeUtilsBar ref={barContainerRef} registerProximityLostFn={registerProximityLostFn}
                onConnectClick={handleConnectClick} onCopyClick={handleCopy}
                onDelete={handleDelete} onTransform={handleTransform} onRegenerate={handleRegenerate}
                hasContent={hasContent} isTransforming={isTransforming} disabled={isGenerating ?? false}
                onMoreClick={handleMoreClick} onAIClick={api.handleDoubleClick} />
            {contextMenu.isOpen && contextMenu.position && (
                <IdeaCardContextMenuSection nodeId={id} position={contextMenu.position} onClose={contextMenu.close}
                    onTagClick={handleTagOpen} onImageClick={handleImageClick} onAttachmentClick={handleAttachmentClick}
                    onFocusClick={handleFocusClick} onDuplicateClick={handleDuplicate} onShareClick={handleShare}
                    isSharing={isSharing} onPinToggle={handlePinToggle} onCollapseToggle={handleCollapseToggle}
                    onPoolToggle={handlePoolToggle} onColorChange={handleColorChange} nodeColorKey={nodeColorKey}
                    isPinned={isPinned ?? false} isCollapsed={isCollapsed ?? false}
                    isInPool={resolvedData.includeInAIPool ?? false} />
            )}
            <Handle type="source" position={Position.Bottom} id={`${id}-source`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleBottom}`} />
        </div>
    );
});
