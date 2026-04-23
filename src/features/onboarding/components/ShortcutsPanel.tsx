/**
 * ShortcutsPanel — keyboard cheat sheet with replay walkthrough link.
 * Portal-rendered; dismissed by Escape or close button.
 */
import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import { strings } from '@/shared/localization/strings';
import { ShortcutList } from './ShortcutList';

interface ShortcutsPanelProps {
    readonly onClose:  () => void;
    readonly onReplay: () => void;
}

/** Portal-rendered keyboard shortcuts cheat sheet; dismissed by Escape or the close button. */
export const ShortcutsPanel = React.memo(function ShortcutsPanel({ onClose, onReplay }: ShortcutsPanelProps) {
    useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, true, onClose);
    const panelRef = useRef<HTMLDivElement>(null);
    useFocusTrap(panelRef, true);

    return createPortal(
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 z-[var(--z-modal)]" onClick={onClose} aria-hidden="true" />

            {/* Panel */}
            <div
                ref={panelRef}
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
                        onClick={onClose} type="button" aria-label={strings.a11y.dialogClose}
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
