/**
 * NodeUtilsBar — Flat 5-action floating bar tucked behind node.
 * AI/Transform | Connect | Copy | Delete | More
 * Memoized per CLAUDE.md performance rules (500+ node canvases).
 */
import React, { forwardRef, useCallback, useEffect } from 'react';
import { strings } from '@/shared/localization/strings';
import { NodeUtilsBarAIOrTransform } from './NodeUtilsBarAIOrTransform';
import { TooltipButton } from './TooltipButton';
import { useNodeUtilsBar } from '../../hooks/useNodeUtilsBar';
import type { NodeUtilsBarProps } from './NodeUtilsBar.types';
import buttonStyles from './TooltipButton.module.css';
import styles from './NodeUtilsBar.module.css';

export const NodeUtilsBar = React.memo(forwardRef<HTMLDivElement, NodeUtilsBarProps>(
    function NodeUtilsBar(props, ref) {
        const { disabled = false, registerProximityLostFn } = props;
        const bar = useNodeUtilsBar();

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

        return (
            <div ref={mergedRef} className={styles.barWrapper} data-node-section="utils">
                <div
                    className={styles.deckOne}
                    role="toolbar"
                    aria-label={strings.canvas.nodeActionsLabel}
                    onMouseEnter={bar.handleHoverEnter}
                    onMouseLeave={bar.handleHoverLeave}
                >
                    <NodeUtilsBarAIOrTransform
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
                    <TooltipButton label={strings.nodeUtils.connect}
                        tooltipText={strings.nodeUtils.connect}
                        icon="🔗" onClick={props.onConnectClick}
                        disabled={disabled} tooltipPlacement="right" />
                    <TooltipButton label={strings.nodeUtils.copy}
                        tooltipText={strings.nodeUtils.copy}
                        shortcut={strings.nodeUtils.copyShortcut}
                        icon="📋" onClick={() => props.onCopyClick?.()}
                        disabled={disabled || !(props.hasContent ?? false)}
                        tooltipPlacement="right" />
                    <TooltipButton label={strings.nodeUtils.delete}
                        tooltipText={strings.nodeUtils.delete}
                        shortcut={strings.nodeUtils.deleteShortcut}
                        icon="🗑️" onClick={props.onDelete}
                        disabled={disabled} className={buttonStyles.deleteButton}
                        tooltipPlacement="right" />
                    <TooltipButton label={strings.nodeUtils.more}
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
