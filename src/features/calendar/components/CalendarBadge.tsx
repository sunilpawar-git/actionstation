/**
 * CalendarBadge - Visual indicator for calendar items on IdeaCard nodes
 * Displays type icon, title, date, and sync status
 */
import React from 'react';
import type { CalendarEventMetadata } from '../types/calendarEvent';
import clsx from 'clsx';
import { calendarStrings as cs } from '../localization/calendarStrings';

const TYPE_ICONS: Record<string, string> = {
    event: '📅',
    reminder: '⏰',
    todo: '✓',
};

const STATUS_ICONS: Record<string, string> = {
    synced: '✓',
    pending: '⏳',
    failed: '⚠️',
};

const DEFAULT_TYPE_ICON = '📋';
const DEFAULT_STATUS_ICON = '?';

interface CalendarBadgeProps {
    metadata: CalendarEventMetadata;
    onClick?: () => void;
    onRetry?: () => void;
}

/** Formats an ISO date string as a short locale date + time (e.g. "Mar 16, 2:30 PM"). */
function formatBadgeDate(isoDate: string): string {
    try {
        const d = new Date(isoDate);
        const datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        return `${datePart}, ${timePart}`;
    } catch {
        return '';
    }
}

/** Calendar event badge showing type icon, title, date, and sync status on IdeaCard nodes. */
export const CalendarBadge = React.memo(({ metadata, onClick, onRetry }: CalendarBadgeProps) => {
    const { type, title, date, status, error } = metadata;

    const handleRetryClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRetry?.();
    };

    const badgeTitle = status === 'failed' ? (error ?? cs.errors.createFailed) : cs.badge.viewEvent;
    const Tag = onClick ? 'button' : 'div';

    const typeBorderClass: Record<string, string> = {
        event: 'border-l-[3px] border-l-[var(--color-primary)]',
        reminder: 'border-l-[3px] border-l-[var(--color-warning)]',
        todo: 'border-l-[3px] border-l-[var(--color-success)]',
    };

    return (
        <Tag
            className={clsx(
                'inline-flex items-center border border-[var(--color-border)] rounded-sm bg-[var(--color-surface-elevated)] cursor-pointer leading-[var(--line-height-tight)] transition-all duration-150 ease-in-out max-w-full overflow-hidden whitespace-nowrap hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-focus)]',
                typeBorderClass[type],
                status === 'pending' && 'opacity-80',
                status === 'failed' && 'border-[var(--color-error)]'
            )}
            style={{ fontSize: 'var(--font-size-sm)', gap: 2, padding: '2px 4px' }}
            data-testid="calendar-badge"
            data-type={type}
            data-status={status}
            onClick={onClick}
            title={badgeTitle}
            {...(onClick ? { type: 'button' as const } : {})}
        >
            <span className="shrink-0">{TYPE_ICONS[type] ?? DEFAULT_TYPE_ICON}</span>
            <span className="overflow-hidden text-ellipsis text-[var(--color-text-primary)] font-medium" data-testid="badge-title">{title}</span>
            <span className="text-[var(--color-text-secondary)] shrink-0" data-testid="badge-date">{formatBadgeDate(date)}</span>
            <span className="shrink-0" style={{ fontSize: 'var(--font-size-xs)' }}>{STATUS_ICONS[status] ?? DEFAULT_STATUS_ICON}</span>
            {(status === 'failed' || status === 'pending') && onRetry && (
                <span
                    className="shrink-0 border-none bg-transparent text-[var(--color-primary)] cursor-pointer font-bold rounded-sm hover:bg-[var(--color-primary-light)]"
                    style={{ fontSize: 'var(--font-size-sm)', padding: '0 2px' }}
                    onClick={handleRetryClick}
                    title={cs.badge.retry}
                    role="button"
                    tabIndex={0}
                >
                    ↻
                </span>
            )}
        </Tag>
    );
});
