/**
 * Canvas Section - Canvas display, scroll mode, connector style, auto-save, and AI Memory settings.
 * Organized into SettingsGroup cards for clear visual hierarchy.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { useSettingsStore, type CanvasScrollMode } from '@/shared/stores/settingsStore';
import { Toggle } from '@/shared/components/Toggle';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { ConnectorStylePicker } from './ConnectorStylePicker';
import { AIMemorySection } from './AIMemorySection';
import { GridColumnsControl } from '@/features/settings/components/GridColumnsControl';
import { SettingsGroup } from './SettingsGroup';
import {
    SP_SECTION, SP_SECTION_STYLE,
    SP_SLIDER_GROUP, SP_SLIDER_GROUP_STYLE,
    SP_SLIDER_VALUE, SP_SLIDER_VALUE_STYLE,
} from '../settingsPanelStyles';

const SCROLL_MODE_OPTIONS = [
    { value: 'zoom' as CanvasScrollMode, label: strings.settings.canvasScrollZoom },
    { value: 'navigate' as CanvasScrollMode, label: strings.settings.canvasScrollNavigate },
] as const;

function AutoSaveSlider({ interval }: { interval: number }) {
    return (
        <div className={SP_SLIDER_GROUP} style={SP_SLIDER_GROUP_STYLE}>
            <input
                type="range"
                min={10}
                max={300}
                step={10}
                value={interval}
                onChange={(e) => useSettingsStore.getState().setAutoSaveInterval(Number(e.target.value))}
                aria-label={strings.settings.autoSaveInterval}
                className="settings-slider"
                style={{ flex: 1 }}
            />
            <span className={SP_SLIDER_VALUE} style={SP_SLIDER_VALUE_STYLE}>
                {interval} {strings.settings.seconds}
            </span>
        </div>
    );
}

export const CanvasSection = React.memo(function CanvasSection() {
    const canvasGrid = useSettingsStore((s) => s.canvasGrid);
    const canvasFreeFlow = useSettingsStore((s) => s.canvasFreeFlow);
    const autoSave = useSettingsStore((s) => s.autoSave);
    const autoSaveInterval = useSettingsStore((s) => s.autoSaveInterval);
    const canvasScrollMode = useSettingsStore((s) => s.canvasScrollMode);
    const connectorStyle = useSettingsStore((s) => s.connectorStyle);
    const autoAnalyze = useSettingsStore((s) => s.autoAnalyzeDocuments);

    return (
        <div className={SP_SECTION} style={SP_SECTION_STYLE}>
            <SettingsGroup title={strings.settings.displayGroup}>
                <Toggle id="canvas-grid" checked={canvasGrid}
                    onChange={() => useSettingsStore.getState().toggleCanvasGrid()}
                    label={strings.settings.canvasGrid} />
                <Toggle id="canvas-free-flow" checked={canvasFreeFlow}
                    onChange={() => useSettingsStore.getState().toggleCanvasFreeFlow()}
                    label={strings.settings.freeFlow} />
                <GridColumnsControl />
            </SettingsGroup>

            <SettingsGroup title={strings.settings.canvasScrollMode}>
                <SegmentedControl name="canvasScrollMode" label={strings.settings.canvasScrollMode}
                    options={SCROLL_MODE_OPTIONS} value={canvasScrollMode}
                    onChange={(v) => useSettingsStore.getState().setCanvasScrollMode(v)} />
            </SettingsGroup>

            <SettingsGroup title={strings.settings.connectorStyle}>
                <ConnectorStylePicker value={connectorStyle}
                    onChange={(v) => useSettingsStore.getState().setConnectorStyle(v)} />
            </SettingsGroup>

            <SettingsGroup title={strings.settings.autoSaveGroup}>
                <Toggle id="canvas-auto-save" checked={autoSave}
                    onChange={() => { const s = useSettingsStore.getState(); s.setAutoSave(!s.autoSave); }}
                    label={strings.settings.autoSave} />
                {autoSave && <AutoSaveSlider interval={autoSaveInterval} />}
            </SettingsGroup>

            <SettingsGroup title={strings.settings.aiDocumentsGroup}>
                <Toggle id="canvas-auto-analyze" checked={autoAnalyze}
                    onChange={() => useSettingsStore.getState().toggleAutoAnalyzeDocuments()}
                    label={strings.settings.autoAnalyzeDocuments}
                    description={strings.settings.autoAnalyzeDocumentsHint} />
                <AIMemorySection />
            </SettingsGroup>
        </div>
    );
});
