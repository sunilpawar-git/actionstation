/**
 * TooltipButton — Action button with portal-based tooltip on hover
 * Wraps a single icon button and manages tooltip visibility via ref (no useState).
 * CSS :hover drives visual button states (no React state for styling).
 * Tooltip visibility uses useState — isolated to this component by React.memo.
 * Memoized per CLAUDE.md performance rules (500+ node canvases).
 */
import React, { useRef, useCallback, useId, useState } from 'react';
import { PortalTooltip } from '@/shared/components/PortalTooltip';
import type { PortalTooltipProps } from '@/shared/components/PortalTooltip';
import styles from './TooltipButton.module.css';

export interface TooltipButtonProps {
    /** Accessible label (aria-label) */
    label: string;
    /** Tooltip text shown on hover (omit to suppress tooltip) */
    tooltipText?: string;
    /** Optional keyboard shortcut hint (e.g. "⌫") */
    shortcut?: string;
    /** Emoji or icon content */
    icon: string;
    /** Click handler */
    onClick: () => void;
    /** Whether button is disabled */
    disabled?: boolean;
    /** Additional CSS class (e.g. deleteButton) */
    className?: string;
    /** Tooltip placement — forwarded to PortalTooltip */
    tooltipPlacement?: PortalTooltipProps['placement'];
    /** Additional mouse enter handler (fired alongside tooltip tracking) */
    onMouseEnter?: () => void;
    /** Additional mouse leave handler (fired alongside tooltip tracking) */
    onMouseLeave?: () => void;
    /** aria-expanded for toggle buttons */
    'aria-expanded'?: boolean;
    /** aria-haspopup for menu trigger buttons */
    'aria-haspopup'?: boolean | 'true' | 'false' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
}

export const TooltipButton = React.memo(function TooltipButton({
    label,
    tooltipText,
    shortcut,
    icon,
    onClick,
    disabled = false,
    className,
    tooltipPlacement,
    onMouseEnter: onMouseEnterProp,
    onMouseLeave: onMouseLeaveProp,
    'aria-expanded': ariaExpanded,
    'aria-haspopup': ariaHasPopup,
}: TooltipButtonProps) {
    const [hovered, setHovered] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const tooltipId = useId();
    const isTooltipVisible = hovered && !disabled;

    const handleMouseEnter = useCallback(() => { setHovered(true); onMouseEnterProp?.(); }, [onMouseEnterProp]);
    const handleMouseLeave = useCallback(() => { setHovered(false); onMouseLeaveProp?.(); }, [onMouseLeaveProp]);

    const buttonClass = className
        ? `${styles.actionButton} ${className}`
        : styles.actionButton;

    return (
        <>
            <button
                ref={buttonRef}
                className={buttonClass}
                onClick={onClick}
                disabled={disabled}
                aria-label={label}
                aria-describedby={tooltipText && isTooltipVisible ? tooltipId : undefined}
                aria-expanded={ariaExpanded}
                aria-haspopup={ariaHasPopup}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <span className={styles.icon}>{icon}</span>
            </button>
            {tooltipText && (
                <PortalTooltip
                    text={tooltipText}
                    shortcut={shortcut}
                    targetRef={buttonRef}
                    visible={isTooltipVisible}
                    placement={tooltipPlacement}
                    tooltipId={tooltipId}
                />
            )}
        </>
    );
});
