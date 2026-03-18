export const KB_SEARCH_BAR = 'border-b border-[var(--color-border)] shrink-0';
export const KB_SEARCH_BAR_STYLE = { padding: '8px 16px 4px' } as const;

export const KB_SEARCH_INPUT = [
    'w-full border border-[var(--color-border)]',
    'rounded-[var(--radius-sm,6px)]',
    'bg-[var(--color-surface)]',
    'outline-none',
    'focus:border-[var(--color-primary)]',
].join(' ');
export const KB_SEARCH_INPUT_STYLE = {
    padding: '6px 10px',
    color: 'var(--color-text-primary)',
    fontSize: 13,
} as const;

export const KB_TYPE_FILTERS = 'flex';
export const KB_TYPE_FILTERS_STYLE = { gap: 4, marginTop: 6, paddingBottom: 6 } as const;

export const KB_FILTER_PILL = [
    'border border-[var(--color-border)]',
    'rounded-[var(--radius-sm,12px)]',
    'cursor-pointer',
    'transition-all duration-150 ease-in-out',
].join(' ');
export const KB_FILTER_PILL_STYLE = {
    padding: '2px 8px',
    background: 'transparent',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-xs, 11px)',
} as const;

export const KB_FILTER_PILL_ACTIVE_STYLE = {
    padding: '2px 8px',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-text-on-primary)',
    borderColor: 'var(--color-primary)',
    fontSize: 'var(--font-size-xs, 11px)',
} as const;

export const KB_TAG_FILTERS = 'flex flex-wrap';
export const KB_TAG_FILTERS_STYLE = { gap: 4, marginTop: 4, paddingBottom: 4 } as const;

export const KB_TAG_PILL = [
    'border border-[var(--color-border)]',
    'rounded-[var(--radius-sm,10px)]',
    'cursor-pointer',
    'transition-all duration-150 ease-in-out',
].join(' ');
export const KB_TAG_PILL_STYLE = {
    padding: '1px 7px',
    background: 'transparent',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-xs, 10px)',
} as const;

export const KB_TAG_PILL_ACTIVE_STYLE = {
    padding: '1px 7px',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-text-on-primary)',
    borderColor: 'var(--color-primary)',
    fontSize: 'var(--font-size-xs, 10px)',
} as const;
