/**
 * ShortcutsPanel — keyboard cheat sheet with replay walkthrough link.
 * Portal-rendered; dismissed by Escape or close button.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { strings } from '@/shared/localization/strings';
import { formatShortcut } from '@/shared/utils/platform';

interface ShortcutsPanelProps {
    readonly onClose:  () => void;
    readonly onReplay: () => void;
}

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
function ShortcutList() {
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

/** Portal-rendered keyboard shortcuts cheat sheet; dismissed by Escape or the close button. */
export const ShortcutsPanel = React.memo(function ShortcutsPanel({ onClose, onReplay }: ShortcutsPanelProps) {
    useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, true, onClose);

    return createPortal(
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 z-[var(--z-modal)]" onClick={onClose} aria-hidden="true" />

            {/* Panel */}
            <div
                className="fixed bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden z-[calc(var(--z-modal)+1)]"
                style={{ bottom: 'var(--space-lg)', right: 'var(--space-lg)', minWidth: 320, maxWidth: 400, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}
                onClick={(e) => e.stopPropagation()}
                role="dialog" aria-modal="true"
                aria-label={strings.onboarding.shortcutsPanelTitle}
                data-testid="shortcuts-panel"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--color-border)]" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                    <h2 className="font-semibold text-[var(--color-text-primary)]" style={{ fontSize: 'var(--font-size-base)', margin: 0 }}>
                        {strings.onboarding.shortcutsPanelTitle}
                    </h2>
                    <button
                        className="text-[var(--color-text-muted)] cursor-pointer leading-none hover:text-[var(--color-text-secondary)]"
                        style={{ background: 'transparent', border: 'none', fontSize: 'var(--font-size-sm)', padding: 'var(--space-xxs)' }}
                        onClick={onClose} type="button" aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <ShortcutList />

                {/* Footer */}
                <div className="border-t border-[var(--color-border)]" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                    <button
                        className="text-[var(--color-primary)] cursor-pointer hover:underline"
                        style={{ background: 'transparent', border: 'none', fontSize: 'var(--font-size-sm)', padding: 0 }}
                        onClick={onReplay} type="button" data-testid="replay-btn"
                    >
                        {strings.onboarding.replayWalkthrough}
                    </button>
                </div>
            </div>
        </>,
        document.body,
    );
});
