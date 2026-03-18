/**
 * Keyboard Shortcuts Section - Platform-aware shortcut display
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { formatShortcut } from '@/shared/utils/platform';
import { SettingsGroup } from './SettingsGroup';
import {
    SP_SECTION, SP_SECTION_STYLE,
    SP_SHORTCUT_LIST, SP_SHORTCUT_LIST_STYLE,
    SP_SHORTCUT_ITEM, SP_SHORTCUT_ITEM_STYLE,
    SP_SHORTCUT_ACTION, SP_SHORTCUT_ACTION_STYLE,
    SP_SHORTCUT_KEYS, SP_SHORTCUT_KEYS_STYLE,
} from '../settingsPanelStyles';

interface ShortcutItem {
    action: string;
    keys: string;
}

/** Static shortcut list — built once at module load (platform never changes mid-session) */
const SHORTCUTS: readonly ShortcutItem[] = [
    { action: strings.shortcuts.openSettings, keys: formatShortcut(',') },
    { action: strings.shortcuts.search, keys: formatShortcut('K') },
    { action: strings.shortcuts.addNode, keys: 'N' },
    { action: strings.shortcuts.quickCapture, keys: formatShortcut('N') },
    { action: strings.shortcuts.deleteNode, keys: 'Delete / Backspace' },
    { action: strings.shortcuts.clearSelection, keys: 'Escape' },
    { action: strings.shortcuts.undo, keys: formatShortcut('Z') },
    { action: strings.shortcuts.redo, keys: formatShortcut('Shift + Z') },
    { action: strings.shortcuts.zoomIn, keys: formatShortcut('[') },
    { action: strings.shortcuts.zoomOut, keys: formatShortcut(']') },
    { action: strings.shortcuts.focusModeClick, keys: formatShortcut('Click') },
];

export const KeyboardSection = React.memo(function KeyboardSection() {
    return (
        <div className={SP_SECTION} style={SP_SECTION_STYLE}>
            <SettingsGroup title={strings.settings.keyboard}>
                <div className={SP_SHORTCUT_LIST} style={SP_SHORTCUT_LIST_STYLE}>
                    {SHORTCUTS.map((shortcut) => (
                        <div key={shortcut.action} className={SP_SHORTCUT_ITEM} style={SP_SHORTCUT_ITEM_STYLE}>
                            <span className={SP_SHORTCUT_ACTION} style={SP_SHORTCUT_ACTION_STYLE}>
                                {shortcut.action}
                            </span>
                            <kbd className={SP_SHORTCUT_KEYS} style={SP_SHORTCUT_KEYS_STYLE}>
                                {shortcut.keys}
                            </kbd>
                        </div>
                    ))}
                </div>
            </SettingsGroup>
        </div>
    );
});
