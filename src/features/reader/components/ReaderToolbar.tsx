/**
 * ReaderToolbar — Controls for the reader shell.
 * Page navigation, flip panes, close button.
 * Implements WAI-ARIA toolbar pattern with arrow-key navigation.
 * Uses string resources and CSS variables only.
 */
import React, { useCallback, useRef } from 'react';
import { strings } from '@/shared/localization/strings';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)]';
const BTN_BASE = `px-2.5 py-1.5 text-xs rounded-md transition-colors ${FOCUS_RING}`;
const BTN_SECONDARY = `${BTN_BASE} bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]`;
const BTN_CLOSE = `${BTN_BASE} text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]`;
const BTN_PAGE = `px-2 py-1 rounded-md hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-default transition-colors ${FOCUS_RING}`;

interface ReaderToolbarProps {
    currentPage?: number;
    totalPages?: number;
    isPdf?: boolean;
    onPrevPage?: () => void;
    onNextPage?: () => void;
    onFlipPanes: () => void;
    onClose: () => void;
}

export const ReaderToolbar = React.memo(function ReaderToolbar({
    currentPage = 1,
    totalPages = 0,
    isPdf = false,
    onPrevPage,
    onNextPage,
    onFlipPanes,
    onClose,
}: ReaderToolbarProps) {
    const toolbarRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const toolbar = toolbarRef.current;
        if (!toolbar) return;
        const buttons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        const idx = buttons.indexOf(e.target as HTMLButtonElement);
        if (idx < 0) return;

        let next = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            next = (idx + 1) % buttons.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            next = (idx - 1 + buttons.length) % buttons.length;
        } else if (e.key === 'Home') {
            next = 0;
        } else if (e.key === 'End') {
            next = buttons.length - 1;
        }

        const target = next >= 0 ? buttons[next] : undefined;
        if (target) {
            e.preventDefault();
            target.focus();
        }
    }, []);

    return (
        <div
            ref={toolbarRef}
            className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] shrink-0"
            role="toolbar"
            aria-label={strings.reader.readerPanel}
            onKeyDown={handleKeyDown}
        >
            <div className="flex items-center gap-2">
                <button type="button" onClick={onFlipPanes}
                    className={BTN_SECONDARY} title={strings.reader.flipPanes}
                    aria-label={strings.reader.flipPanes}>
                    ⇄
                </button>
            </div>

            {isPdf && totalPages > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]"
                    role="group" aria-label={strings.reader.pageNavigation}>
                    <button type="button" onClick={onPrevPage}
                        disabled={currentPage <= 1} className={BTN_PAGE}
                        aria-label={strings.reader.previousPage}>
                        ‹
                    </button>
                    <span aria-live="polite" aria-atomic="true">
                        {currentPage} {strings.reader.pageOf} {totalPages}
                    </span>
                    <button type="button" onClick={onNextPage}
                        disabled={currentPage >= totalPages} className={BTN_PAGE}
                        aria-label={strings.reader.nextPage}>
                        ›
                    </button>
                </div>
            )}

            <button type="button" onClick={onClose}
                className={BTN_CLOSE} aria-label={strings.reader.closeReader}>
                {strings.common.closeSymbol}
            </button>
        </div>
    );
});
