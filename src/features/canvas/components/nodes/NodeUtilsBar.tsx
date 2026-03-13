/**
 * NodeUtilsBar — Configurable floating bar tucked behind node.
 * Button order and visibility driven by user settings in settingsStore.
 * The "More…" button is always appended as the last item to open the context menu.
 * Memoized per CLAUDE.md performance rules (500+ node canvases).
 */
import React, { forwardRef, useCallback, useEffect } from 'react';
import { strings } from '@/shared/localization/strings';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { ACTION_REGISTRY, type ActionId } from '@/shared/stores/iconRegistry';
import { NodeUtilsBarAIOrTransform } from './NodeUtilsBarAIOrTransform';
import { TooltipButton } from './TooltipButton';
import { useNodeUtilsBar } from '../../hooks/useNodeUtilsBar';
import type { NodeUtilsBarProps } from './NodeUtilsBar.types';
import buttonStyles from './TooltipButton.module.css';
import styles from './NodeUtilsBar.module.css';

export const NodeUtilsBar = React.memo(forwardRef<HTMLDivElement, NodeUtilsBarProps>(
    function NodeUtilsBar(props, ref) {
        const { disabled = false, registerProximityLostFn, onCopyClick } = props;
        const bar = useNodeUtilsBar();
        const handleCopyClick = useCallback(() => { onCopyClick?.(); }, [onCopyClick]);

        // Read icon placement from settings (scalar selector — no destructuring)
        const utilsBarIcons = useSettingsStore((s) => s.utilsBarIcons);

        useEffect(() => {
            registerProximityLostFn?.(bar.handleProximityLost);
        }, [registerProximityLostFn, bar.handleProximityLost]);

        const mergedRef = useCallback((node: HTMLDivElement | null) => {
            /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion -- RefObject.current is readonly */
            (bar.containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
            /* eslint-enable @typescript-eslint/no-unnecessary-type-assertion */
        }, [bar.containerRef, ref]);

        /** Render a single toolbar button by its ActionId */
        const renderButton = useCallback((id: ActionId) => {
            const meta = ACTION_REGISTRY.get(id);
            if (!meta) return null;

            switch (id) {
                case 'ai':
                    return (
                        <NodeUtilsBarAIOrTransform
                            key="ai"
                            onTransform={props.onTransform}
                            isTransformOpen={bar.isTransformOpen}
                            onTransformToggle={bar.handleTransformToggle}
                            onCloseSubmenu={bar.closeSubmenu}
                            onRegenerate={props.onRegenerate}
                            disabled={disabled}
                            hasContent={props.hasContent ?? false}
                            isTransforming={props.isTransforming ?? false}
                            tooltipPlacement="right"
                            onAIClick={props.onAIClick}
                        />
                    );
                case 'connect':
                    return (
                        <TooltipButton key="connect"
                            label={strings.nodeUtils.connect}
                            tooltipText={strings.nodeUtils.connect}
                            icon={strings.nodeUtils.connectIcon} onClick={props.onConnectClick}
                            disabled={disabled} tooltipPlacement="right" />
                    );
                case 'copy':
                    return (
                        <TooltipButton key="copy"
                            label={strings.nodeUtils.copy}
                            tooltipText={strings.nodeUtils.copy}
                            shortcut={strings.nodeUtils.copyShortcut}
                            icon={strings.nodeUtils.copyIcon} onClick={handleCopyClick}
                            disabled={disabled || !(props.hasContent ?? false)}
                            tooltipPlacement="right" />
                    );
                case 'delete':
                    return (
                        <TooltipButton key="delete"
                            label={strings.nodeUtils.delete}
                            tooltipText={strings.nodeUtils.delete}
                            shortcut={strings.nodeUtils.deleteShortcut}
                            icon={strings.nodeUtils.deleteIcon} onClick={props.onDelete}
                            disabled={disabled} className={buttonStyles.deleteButton}
                            tooltipPlacement="right" />
                    );
                case 'pin':
                    return (
                        <TooltipButton key={id}
                            label={props.isPinned ? strings.nodeUtils.unpin : strings.nodeUtils.pin}
                            tooltipText={props.isPinned ? strings.nodeUtils.unpin : strings.nodeUtils.pin}
                            icon={meta.icon}
                            onClick={props.onPinToggle ?? props.onMoreClick}
                            disabled={disabled} tooltipPlacement="right" />
                    );
                case 'duplicate':
                    return (
                        <TooltipButton key={id}
                            label={meta.label()} tooltipText={meta.label()} icon={meta.icon}
                            onClick={props.onDuplicateClick ?? props.onMoreClick}
                            disabled={disabled} tooltipPlacement="right" />
                    );
                case 'collapse':
                    return (
                        <TooltipButton key={id}
                            label={props.isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse}
                            tooltipText={props.isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse}
                            icon={props.isCollapsed ? '🔽' : '🔼'}
                            onClick={props.onCollapseToggle ?? props.onMoreClick}
                            disabled={disabled} tooltipPlacement="right" />
                    );
                case 'focus':
                    return (
                        <TooltipButton key={id}
                            label={meta.label()} tooltipText={meta.label()} icon={meta.icon}
                            onClick={props.onFocusClick ?? props.onMoreClick}
                            disabled={disabled} tooltipPlacement="right" />
                    );
                case 'tags':
                    return (
                        <TooltipButton key={id}
                            label={meta.label()} tooltipText={meta.label()} icon={meta.icon}
                            onClick={props.onTagClick ?? props.onMoreClick}
                            disabled={disabled} tooltipPlacement="right" />
                    );
                case 'mindmap':
                    return (
                        <TooltipButton key={id}
                            label={props.isMindmapMode ? strings.nodeUtils.textView : strings.nodeUtils.mindmapView}
                            tooltipText={props.isMindmapMode ? strings.nodeUtils.textView : strings.nodeUtils.mindmapView}
                            icon={meta.icon}
                            onClick={props.onContentModeToggle ?? props.onMoreClick}
                            disabled={disabled} tooltipPlacement="right" />
                    );
                case 'image':
                    return (
                        <TooltipButton key={id}
                            label={meta.label()} tooltipText={meta.label()} icon={meta.icon}
                            onClick={props.onImageClick ?? props.onMoreClick}
                            disabled={disabled} tooltipPlacement="right" />
                    );
                case 'attachment':
                    return (
                        <TooltipButton key={id}
                            label={meta.label()} tooltipText={meta.label()} icon={meta.icon}
                            onClick={props.onAttachmentClick ?? props.onMoreClick}
                            disabled={disabled} tooltipPlacement="right" />
                    );
                case 'pool':
                    return (
                        <TooltipButton key={id}
                            label={props.isInPool ? strings.nodePool.removeFromPool : strings.nodePool.addToPool}
                            tooltipText={props.isInPool ? strings.nodePool.removeFromPool : strings.nodePool.addToPool}
                            icon={meta.icon}
                            onClick={props.onPoolToggle ?? props.onMoreClick}
                            disabled={disabled} tooltipPlacement="right" />
                    );
                // Color & Share need sub-panels → open context menu
                case 'color':
                case 'share':
                    return (
                        <TooltipButton key={id}
                            label={meta.label()} tooltipText={meta.label()} icon={meta.icon}
                            onClick={props.onMoreClick}
                            disabled={disabled} tooltipPlacement="right" />
                    );
                default:
                    return null;
            }
        }, [props, bar.isTransformOpen, bar.handleTransformToggle, bar.closeSubmenu, disabled, handleCopyClick]);

        return (
            <div ref={mergedRef} className={styles.barWrapper} data-node-section="utils">
                <div
                    className={styles.deckOne}
                    role="toolbar"
                    aria-label={strings.canvas.nodeActionsLabel}
                    onMouseEnter={bar.handleHoverEnter}
                    onMouseLeave={bar.handleHoverLeave}
                >
                    {utilsBarIcons.map(renderButton)}
                    {/* "More…" is always last — opens the context menu */}
                    <TooltipButton key="more"
                        label={strings.nodeUtils.more}
                        tooltipText={strings.nodeUtils.more}
                        icon={strings.nodeUtils.moreIcon}
                        onClick={props.onMoreClick}
                        disabled={disabled} tooltipPlacement="right"
                        aria-haspopup="true" />
                </div>
                <div className={styles.peekIndicator} aria-hidden="true" />
            </div>
        );
    },
));
