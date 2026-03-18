/**
 * Appearance Section - Theme swatch picker and compact mode toggle
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { useSettingsStore, type ThemeOption } from '@/shared/stores/settingsStore';
import { Toggle } from '@/shared/components/Toggle';
import { SettingsGroup } from './SettingsGroup';
import { SP_SECTION, SP_SECTION_STYLE } from '../settingsPanelStyles';
import styles from './AppearanceSection.module.css';

interface ThemeSwatchConfig {
    value: ThemeOption;
    label: string;
}

const THEME_SWATCHES: readonly ThemeSwatchConfig[] = [
    { value: 'light', label: strings.settings.themeLight },
    { value: 'dark', label: strings.settings.themeDark },
    { value: 'sepia', label: strings.settings.themeSepia },
    { value: 'grey', label: strings.settings.themeGrey },
    { value: 'darkBlack', label: strings.settings.themeDarkBlack },
    { value: 'system', label: strings.settings.themeSystem },
];

export const AppearanceSection = React.memo(function AppearanceSection() {
    const theme = useSettingsStore((state) => state.theme);
    const compactMode = useSettingsStore((state) => state.compactMode);

    return (
        <div className={SP_SECTION} style={SP_SECTION_STYLE}>
            <SettingsGroup title={strings.settings.theme}>
                <div
                    className={styles.themeSwatchGrid}
                    role="radiogroup"
                    aria-labelledby="theme-picker-label"
                >
                    {THEME_SWATCHES.map((swatch) => (
                        <label
                            key={swatch.value}
                            className={`${styles.themeSwatch} ${theme === swatch.value ? styles.themeSwatchActive : ''}`}
                        >
                            <input
                                type="radio"
                                name="theme"
                                value={swatch.value}
                                checked={theme === swatch.value}
                                onChange={() => useSettingsStore.getState().setTheme(swatch.value)}
                                className={styles.themeSwatchInput}
                                aria-label={swatch.label}
                            />
                            <span
                                className={styles.themeSwatchPreview}
                                data-swatch={swatch.value}
                            >
                                <span
                                    className={styles.themeSwatchAccent}
                                    data-swatch={swatch.value}
                                />
                            </span>
                            <span className={styles.themeSwatchLabel}>{swatch.label}</span>
                        </label>
                    ))}
                </div>
            </SettingsGroup>

            <SettingsGroup title={strings.settings.displayGroup}>
                <Toggle
                    id="compact-mode"
                    checked={compactMode}
                    onChange={() => useSettingsStore.getState().toggleCompactMode()}
                    label={strings.settings.compactMode}
                    description={strings.settings.compactModeDescription}
                />
            </SettingsGroup>
        </div>
    );
});
