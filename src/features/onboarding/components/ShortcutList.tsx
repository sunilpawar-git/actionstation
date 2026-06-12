/**
 * ShortcutList — renders the keyboard shortcut reference <ul>.
 * Extracted from ShortcutsPanel to keep that component within the 100-line limit.
 */
import { strings } from '@/shared/localization/strings';
import { formatShortcut } from '@/shared/utils/platform';

interface ShortcutRow {
    action: string;
    keys:   string;
}

// Built once at module load — platform never changes mid-session
const SHORTCUT_ROWS: readonly ShortcutRow[] = [
    { action: strings.shortcuts.addNode,        keys: 'N' },
    { action: strings.shortcuts.search,         keys: formatShortcut('K') },
    { action: strings.shortcuts.quickCapture,   keys: formatShortcut('N') },
    { action: strings.shortcuts.deleteNode,     keys: 'Delete / Backspace' },
    { action: strings.shortcuts.clearSelection, keys: 'Escape' },
    { action: strings.shortcuts.undo,           keys: formatShortcut('Z') },
    { action: strings.shortcuts.redo,           keys: formatShortcut('Shift + Z') },
    { action: strings.shortcuts.openSettings,   keys: formatShortcut(',') },
    { action: strings.shortcuts.zoomIn,         keys: formatShortcut('[') },
    { action: strings.shortcuts.zoomOut,        keys: formatShortcut(']') },
    { action: strings.shortcuts.toggleLock,     keys: formatShortcut('L') },
    { action: strings.shortcuts.focusModeClick, keys: formatShortcut('Click') },
];

/** Renders the keyboard shortcut reference list as an accessible <ul>. */
export function ShortcutList() {
    return (
        <ul className="flex flex-col" style={{ listStyle: 'none', padding: 'var(--space-sm) var(--space-lg)', margin: 0 }}>
            {SHORTCUT_ROWS.map((row) => (
                <li key={row.action} className="flex items-center justify-between border-b border-[var(--color-border)] last:border-b-0" style={{ padding: 'var(--space-xs) 0' }}>
                    <span className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)' }}>
                        {row.action}
                    </span>
                    <kbd className="text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm font-[inherit]" style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-xxs) var(--space-xs)' }}>
                        {row.keys}
                    </kbd>
                </li>
            ))}
        </ul>
    );
}
