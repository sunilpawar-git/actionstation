/**
 * Settings Panel - Modal with tabbed settings sections
 */
import { strings } from '@/shared/localization/strings';
import { useSettingsStore, type SettingsTabId } from '@/shared/stores/settingsStore';
import { AppearanceSection } from './sections/AppearanceSection';
import { CanvasSection } from './sections/CanvasSection';
import { ToolbarSection } from './sections/ToolbarSection';
import { AccountSection } from './sections/AccountSection';
import { KeyboardSection } from './sections/KeyboardSection';
import { AboutSection } from './sections/AboutSection';
import { useSettingsPanel } from './useSettingsPanel';
import {
    PaletteTabIcon, CanvasTabIcon, SlidersTabIcon,
    UserTabIcon, KeyboardTabIcon, InfoTabIcon,
} from './settingsTabIcons';
import {
    SP_OVERLAY, SP_BACKDROP, SP_BACKDROP_STYLE, SP_PANEL, SP_PANEL_STYLE,
    SP_HEADER, SP_HEADER_STYLE, SP_TITLE, SP_TITLE_STYLE,
    SP_CLOSE_BTN, SP_CLOSE_BTN_STYLE, SP_CONTENT,
    SP_TABS, SP_TABS_STYLE, SP_TAB, SP_TAB_STYLE, SP_TAB_ACTIVE_STYLE,
    SP_SECTION_CONTENT, SP_SECTION_CONTENT_STYLE,
} from './settingsPanelStyles';
import './settingsButtons.css';

interface Tab {
    id: SettingsTabId;
    label: string;
    icon: React.ComponentType;
}

const tabs: Tab[] = [
    { id: 'appearance', label: strings.settings.appearance, icon: PaletteTabIcon },
    { id: 'canvas', label: strings.settings.canvas, icon: CanvasTabIcon },
    { id: 'toolbar', label: strings.settings.toolbar, icon: SlidersTabIcon },
    { id: 'account', label: strings.settings.account, icon: UserTabIcon },
    { id: 'keyboard', label: strings.settings.keyboard, icon: KeyboardTabIcon },
    { id: 'about', label: strings.settings.about, icon: InfoTabIcon },
];

function SectionForTab({ tab }: { tab: SettingsTabId }) {
    switch (tab) {
        case 'appearance': return <AppearanceSection />;
        case 'canvas': return <CanvasSection />;
        case 'toolbar': return <ToolbarSection />;
        case 'account': return <AccountSection />;
        case 'keyboard': return <KeyboardSection />;
        case 'about': return <AboutSection />;
        default: { const _exhaustive: never = tab; return _exhaustive; }
    }
}

const PANEL_ID = 'settings-tabpanel';
const TAB_ID_PREFIX = 'settings-tab-';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
    const { activeTab, sectionRef, innerRef, tabListRef, handleTabKeyDown } =
        useSettingsPanel(isOpen, onClose);

    if (!isOpen) return null;

    return (
        <div className={SP_OVERLAY} role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className={SP_BACKDROP} style={SP_BACKDROP_STYLE}
                onClick={onClose} data-testid="settings-backdrop" />
            <div className={SP_PANEL} style={SP_PANEL_STYLE}>
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
                    <div ref={tabListRef} className={SP_TABS} style={SP_TABS_STYLE}
                        role="tablist" aria-label={strings.settings.title}
                        onKeyDown={handleTabKeyDown}>
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button key={tab.id} data-tab-id={tab.id}
                                    className={SP_TAB}
                                    style={isActive ? SP_TAB_ACTIVE_STYLE : SP_TAB_STYLE}
                                    onClick={() => useSettingsStore.getState().setLastSettingsTab(tab.id)}
                                    role="tab" aria-selected={isActive}
                                    aria-controls={PANEL_ID}
                                    id={`${TAB_ID_PREFIX}${tab.id}`}
                                    tabIndex={isActive ? 0 : -1}>
                                    <Icon />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                    <div ref={sectionRef} className={SP_SECTION_CONTENT}
                        style={SP_SECTION_CONTENT_STYLE} role="tabpanel"
                        id={PANEL_ID} aria-labelledby={`${TAB_ID_PREFIX}${activeTab}`}>
                        <div ref={innerRef} key={activeTab} className="settings-fade-in">
                            <SectionForTab tab={activeTab} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
