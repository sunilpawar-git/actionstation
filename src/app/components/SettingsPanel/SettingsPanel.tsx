/**
 * Settings Panel - Modal with tabbed settings sections
 */
import { useEffect, useRef } from 'react';
import { strings } from '@/shared/localization/strings';
import { useSettingsStore, type SettingsTabId } from '@/shared/stores/settingsStore';
import { AppearanceSection } from './sections/AppearanceSection';
import { CanvasSection } from './sections/CanvasSection';
import { ToolbarSection } from './sections/ToolbarSection';
import { AccountSection } from './sections/AccountSection';
import { KeyboardSection } from './sections/KeyboardSection';
import { AboutSection } from './sections/AboutSection';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import {
    SP_OVERLAY, SP_BACKDROP, SP_BACKDROP_STYLE, SP_PANEL, SP_PANEL_STYLE,
    SP_HEADER, SP_HEADER_STYLE, SP_TITLE, SP_TITLE_STYLE,
    SP_CLOSE_BTN, SP_CLOSE_BTN_STYLE, SP_CONTENT,
    SP_TABS, SP_TABS_STYLE, SP_TAB, SP_TAB_STYLE, SP_TAB_ACTIVE_STYLE,
    SP_SECTION_CONTENT, SP_SECTION_CONTENT_STYLE,
} from './settingsPanelStyles';

interface Tab {
    id: SettingsTabId;
    label: string;
}

const tabs: Tab[] = [
    { id: 'appearance', label: strings.settings.appearance },
    { id: 'canvas', label: strings.settings.canvas },
    { id: 'toolbar', label: strings.settings.toolbar },
    { id: 'account', label: strings.settings.account },
    { id: 'keyboard', label: strings.settings.keyboard },
    { id: 'about', label: strings.settings.about },
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

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
    const activeTab = useSettingsStore((s) => s.lastSettingsTab);
    const sectionRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, isOpen, onClose);

    useEffect(() => {
        const el = sectionRef.current;
        if (el) el.scrollTop = 0;
    }, [activeTab]);

    useEffect(() => {
        const scrollEl = sectionRef.current;
        const innerEl = innerRef.current;
        if (!scrollEl || !innerEl) return;

        const clampScroll = () => {
            requestAnimationFrame(() => {
                const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
                if (scrollEl.scrollTop > maxScroll) scrollEl.scrollTop = Math.max(0, maxScroll);
            });
        };

        const observer = new ResizeObserver(clampScroll);
        observer.observe(innerEl);
        return () => observer.disconnect();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className={SP_OVERLAY} role="dialog" aria-modal="true">
            <div
                className={SP_BACKDROP}
                style={SP_BACKDROP_STYLE}
                onClick={onClose}
                data-testid="settings-backdrop"
            />
            <div className={SP_PANEL} style={SP_PANEL_STYLE}>
                <div className={SP_HEADER} style={SP_HEADER_STYLE}>
                    <h2 className={SP_TITLE} style={SP_TITLE_STYLE}>{strings.settings.title}</h2>
                    <button
                        className={SP_CLOSE_BTN}
                        style={SP_CLOSE_BTN_STYLE}
                        onClick={onClose}
                        aria-label={strings.settings.close}
                    >
                        {strings.common.closeSymbol}
                    </button>
                </div>
                <div className={SP_CONTENT}>
                    <nav className={SP_TABS} style={SP_TABS_STYLE}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={SP_TAB}
                                style={activeTab === tab.id ? SP_TAB_ACTIVE_STYLE : SP_TAB_STYLE}
                                onClick={() => useSettingsStore.getState().setLastSettingsTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                    <div ref={sectionRef} className={SP_SECTION_CONTENT} style={SP_SECTION_CONTENT_STYLE}>
                        <div ref={innerRef}>
                            <SectionForTab tab={activeTab} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
