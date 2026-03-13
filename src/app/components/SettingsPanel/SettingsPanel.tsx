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
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import styles from './SettingsPanel.module.css';

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

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
    const activeTab = useSettingsStore((s) => s.lastSettingsTab);

    useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, isOpen, onClose);

    if (!isOpen) return null;

    const renderSection = () => {
        switch (activeTab) {
            case 'appearance':
                return <AppearanceSection />;
            case 'canvas':
                return <CanvasSection />;
            case 'toolbar':
                return <ToolbarSection />;
            case 'account':
                return <AccountSection />;
            case 'keyboard':
                return <KeyboardSection />;
            case 'about':
                return <AboutSection />;
            default: {
                const _exhaustive: never = activeTab;
                return _exhaustive;
            }
        }
    };

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true">
            <div 
                className={styles.backdrop} 
                onClick={onClose}
                data-testid="settings-backdrop"
            />
            <div className={styles.panel}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{strings.settings.title}</h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label={strings.settings.close}
                    >
                        {strings.common.closeSymbol}
                    </button>
                </div>
                <div className={styles.content}>
                    <nav className={styles.tabs}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                                onClick={() => useSettingsStore.getState().setLastSettingsTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                    <div className={styles.sectionContent}>
                        {renderSection()}
                    </div>
                </div>
            </div>
        </div>
    );
}
