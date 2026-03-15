/**
 * GridColumnsControl — Visual swatch picker for masonry grid column count.
 *
 * Renders a 3×2 grid of swatches (Auto | 2 | 3 | 4 | 5 | 6), each showing a
 * miniature column-layout preview. Follows the AppearanceSection swatch pattern:
 * - Hidden <input type="radio"> for full keyboard & screen-reader support
 * - Visible preview box with CSS-driven column bars (data-column-preview attribute)
 * - Active border via .swatchActive class
 * - No inline styles, no hardcoded colors — all CSS variables
 */
import React from 'react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import type { GridColumnsPreference } from '@/features/canvas/services/gridColumnsResolver';
import { VALID_GRID_COLUMNS } from '@/features/canvas/services/gridColumnsResolver';
import { strings } from '@/shared/localization/strings';
import styles from './GridColumnsControl.module.css';

/** Number of placeholder bars shown in the Auto swatch preview */
const AUTO_PREVIEW_BAR_COUNT = 4;

interface ColumnSwatchConfig {
    value: GridColumnsPreference;
    label: string;
    ariaLabel: string;
    barCount: number;
}

const COLUMN_SWATCHES: readonly ColumnSwatchConfig[] = VALID_GRID_COLUMNS.map((v) => ({
    value: v,
    label: v === 'auto' ? strings.settings.gridColumnsAuto : String(v),
    ariaLabel: v === 'auto'
        ? strings.settings.gridColumnsAuto
        : strings.settings.gridColumnsFixedDescription(v as number),
    barCount: v === 'auto' ? AUTO_PREVIEW_BAR_COUNT : (v as number),
}));

export const GridColumnsControl = React.memo(function GridColumnsControl() {
    const gridColumns = useSettingsStore((s) => s.gridColumns);

    return (
        <div>
            <span id="grid-columns-label" className={styles.label}>
                {strings.settings.gridColumnsLabel}
            </span>
            <div
                className={styles.swatchGrid}
                role="radiogroup"
                aria-labelledby="grid-columns-label"
            >
                {COLUMN_SWATCHES.map((swatch) => {
                    const isActive = swatch.value === gridColumns;
                    return (
                        <label
                            key={String(swatch.value)}
                            className={`${styles.swatch} ${isActive ? styles.swatchActive : ''}`}
                        >
                            <input
                                type="radio"
                                name="grid-columns"
                                value={String(swatch.value)}
                                checked={isActive}
                                onChange={() => useSettingsStore.getState().setGridColumns(swatch.value)}
                                className={styles.swatchInput}
                                aria-label={swatch.ariaLabel}
                            />
                            <span
                                className={styles.swatchPreview}
                                data-column-preview={String(swatch.value)}
                                aria-hidden="true"
                            >
                                {Array.from({ length: swatch.barCount }, (_, i) => (
                                    <span key={`bar-${i}`} className={styles.swatchPreviewBar} />
                                ))}
                            </span>
                            <span className={styles.swatchLabel}>{swatch.label}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
});
