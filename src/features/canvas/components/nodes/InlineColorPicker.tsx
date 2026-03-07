/**
 * InlineColorPicker — Renders color option dots for use inside the context menu.
 * Extracted from ColorMenu's portal rendering into a flat inline list.
 */
import React, { useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import type { NodeColorKey } from '../../types/node';
import styles from './ColorMenu.module.css';

const COLOR_OPTIONS: ReadonlyArray<{ key: NodeColorKey; label: string; dotClass: string }> = [
    { key: 'default', label: strings.nodeUtils.nodeColorDefault, dotClass: styles.dotDefault ?? '' },
    { key: 'danger', label: strings.nodeUtils.nodeColorRed, dotClass: styles.dotDanger ?? '' },
    { key: 'warning', label: strings.nodeUtils.nodeColorYellow, dotClass: styles.dotWarning ?? '' },
    { key: 'success', label: strings.nodeUtils.nodeColorGreen, dotClass: styles.dotSuccess ?? '' },
];

interface InlineColorPickerProps {
    readonly selectedColorKey: NodeColorKey;
    readonly onColorSelect: (colorKey: NodeColorKey) => void;
    readonly onClose: () => void;
}

export const InlineColorPicker = React.memo(function InlineColorPicker({
    selectedColorKey, onColorSelect, onClose,
}: InlineColorPickerProps) {
    const handleSelect = useCallback((colorKey: NodeColorKey) => {
        if (colorKey !== selectedColorKey) onColorSelect(colorKey);
        onClose();
    }, [selectedColorKey, onColorSelect, onClose]);

    return (
        <div role="group" aria-label={strings.nodeUtils.color}>
            {COLOR_OPTIONS.map((option) => (
                <button
                    key={option.key}
                    className={styles.menuItem}
                    onClick={() => handleSelect(option.key)}
                    role="menuitemradio"
                    aria-checked={selectedColorKey === option.key}
                >
                    <span className={`${styles.dot} ${option.dotClass}`} />
                    <span>{option.label}</span>
                </button>
            ))}
        </div>
    );
});
