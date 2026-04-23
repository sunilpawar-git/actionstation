/**
 * Settings Panel - Modal with tabbed settings sections
 */
import { strings } from '@/shared/localization/strings';
import { useRef } from 'react';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import { useSettingsPanel } from './useSettingsPanel';
import {
    SP_OVERLAY, SP_BACKDROP, SP_BACKDROP_STYLE, SP_PANEL, SP_PANEL_STYLE,
    SP_HEADER, SP_HEADER_STYLE, SP_TITLE, SP_TITLE_STYLE,
    SP_CLOSE_BTN, SP_CLOSE_BTN_STYLE, SP_CONTENT,
} from './settingsPanelStyles';
import { SettingsPanelContent } from './SettingsPanelContent';
import './settingsButtons.css';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
    const { activeTab, sectionRef, innerRef, tabListRef, handleTabKeyDown } =
        useSettingsPanel(isOpen, onClose);
    const dialogRef = useRef<HTMLDivElement>(null);
    useFocusTrap(dialogRef, isOpen);

    if (!isOpen) return null;

    return (
        <div className={SP_OVERLAY} role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className={SP_BACKDROP} style={SP_BACKDROP_STYLE}
                onClick={onClose} data-testid="settings-backdrop" />
            <div className={SP_PANEL} ref={dialogRef} style={SP_PANEL_STYLE}>
                <div className={SP_HEADER} style={SP_HEADER_STYLE}>
                    <h2 id="settings-title" className={SP_TITLE} style={SP_TITLE_STYLE}>
                        {strings.settings.title}
                    </h2>
                    <button className={SP_CLOSE_BTN} style={SP_CLOSE_BTN_STYLE}
                        onClick={onClose} aria-label={strings.settings.close}>
                        {strings.common.closeSymbol}
                    </button>
                </div>
                <div className={SP_CONTENT}>
                    <SettingsPanelContent
                        activeTab={activeTab}
                        sectionRef={sectionRef}
                        innerRef={innerRef}
                        tabListRef={tabListRef}
                        handleTabKeyDown={handleTabKeyDown}
                    />
                </div>
            </div>
        </div>
    );
}
