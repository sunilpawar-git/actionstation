/**
 * CanvasTooltip — Shows "Double-click to add a note" on first canvas visit.
 *
 * Displays once per user (tracked via localStorage). Auto-dismisses after 4s
 * or on any click. Uses string resources from canvasStrings SSOT.
 *
 * Positioned bottom-center of the canvas viewport via CSS module.
 */
import { memo, useState, useEffect, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { getStorageItem, setStorageItem } from '@/shared/utils/storage';
import styles from './CanvasTooltip.module.css';

/** LocalStorage key for tooltip dismissed state. Exported for test access. */
export const TOOLTIP_STORAGE_KEY = 'eden-canvas-tooltip-dismissed';
const AUTO_DISMISS_MS = 4000;

function CanvasTooltipInner() {
    const [visible, setVisible] = useState(() => !getStorageItem(TOOLTIP_STORAGE_KEY, false));

    const dismiss = useCallback(() => {
        setVisible(false);
        setStorageItem(TOOLTIP_STORAGE_KEY, true);
    }, []);

    useEffect(() => {
        if (!visible) return;

        const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
        const onInteraction = () => dismiss();

        window.addEventListener('click', onInteraction, { once: true });

        return () => {
            clearTimeout(timer);
            window.removeEventListener('click', onInteraction);
        };
    }, [visible, dismiss]);

    if (!visible) return null;

    return (
        <div className={styles.tooltip} role="status" aria-live="polite">
            {strings.canvas.doubleClickToCreate.tooltip}
        </div>
    );
}

export const CanvasTooltip = memo(CanvasTooltipInner);
