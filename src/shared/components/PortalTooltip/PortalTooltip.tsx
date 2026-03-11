/**
 * PortalTooltip — Shared portal-based tooltip component
 * Renders via createPortal to document.body, escaping parent stacking contexts.
 * Supports optional keyboard shortcut hints and left/right placement.
 *
 * @see Phase 1 of NodeUX Hover & Utilities plan
 */
import { useId, useState, useLayoutEffect, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import styles from './PortalTooltip.module.css';

/** Offset (px) between target element edge and tooltip */
const TOOLTIP_OFFSET_PX = 8;

export interface PortalTooltipProps {
    /** Tooltip label text */
    text: string;
    /** Optional keyboard shortcut hint (e.g. "⌫", "⌘C") */
    shortcut?: string;
    /** Ref to the target element the tooltip is anchored to */
    targetRef: RefObject<HTMLElement | null>;
    /** Whether the tooltip is visible */
    visible: boolean;
    /** Which side of the target to show the tooltip */
    placement?: 'right' | 'left';
    /** Stable id for aria-describedby linkage; auto-generated if omitted */
    tooltipId?: string;
}

/** Compute tooltip inline position from target bounding rect */
function computePosition(
    rect: DOMRect,
    placement: 'right' | 'left',
): React.CSSProperties {
    const top = `${String(rect.top + rect.height / 2)}px`;
    const transform = 'translateY(-50%)';

    if (placement === 'left') {
        return {
            top,
            left: `${String(rect.left - TOOLTIP_OFFSET_PX)}px`,
            transform: `${transform} translateX(-100%)`,
        };
    }

    return {
        top,
        left: `${String(rect.right + TOOLTIP_OFFSET_PX)}px`,
        transform,
    };
}

export function PortalTooltip({
    text,
    shortcut,
    targetRef,
    visible,
    placement = 'right',
    tooltipId: externalId,
}: PortalTooltipProps) {
    const autoId = useId();
    const tooltipId = externalId ?? autoId;
    const [positionStyle, setPositionStyle] = useState<React.CSSProperties | null>(null);

    useLayoutEffect(() => {
        if (!visible || !targetRef.current) {
            setPositionStyle(null);
            return;
        }
        const rect = targetRef.current.getBoundingClientRect();
        setPositionStyle(computePosition(rect, placement));
    }, [visible, targetRef, placement]);

    if (!visible || !positionStyle) return null;

    const classNames = [
        styles.tooltip,
        styles.tooltipVisible,
    ].join(' ');

    const tooltip = (
        <div
            id={tooltipId}
            className={classNames}
            style={positionStyle}
            role="tooltip"
            data-testid="portal-tooltip"
        >
            <span className={styles.label}>{text}</span>
            {shortcut && (
                <span className={styles.shortcutHint}>
                    {strings.tooltip.shortcutSeparator}{shortcut}
                </span>
            )}
        </div>
    );

    return createPortal(tooltip, document.body);
}
