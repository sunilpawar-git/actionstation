export const KB_TAG_INPUT_STYLE = { marginTop: 6 } as const;

export const KB_TAG_LIST = 'flex flex-wrap';
export const KB_TAG_LIST_STYLE = { gap: 4, marginBottom: 4 } as const;

export const KB_TAG = [
    'inline-flex items-center',
    'bg-[var(--color-surface-hover)]',
    'rounded-[var(--radius-sm,12px)]',
    'text-[length:var(--font-size-xs,11px)]',
].join(' ');
export const KB_TAG_STYLE = {
    gap: 2,
    padding: '2px 8px',
    color: 'var(--color-text-secondary)',
} as const;

export const KB_TAG_REMOVE = [
    'border-none cursor-pointer leading-none',
    'hover:text-[var(--color-error)]',
].join(' ');
export const KB_TAG_REMOVE_STYLE = {
    background: 'none',
    color: 'var(--color-text-muted)',
    fontSize: 13,
    padding: '0 2px',
} as const;

export const KB_TAG_FIELD = [
    'w-full border border-[var(--color-border)]',
    'rounded-[var(--radius-sm,6px)]',
    'bg-[var(--color-surface)]',
    'outline-none',
    'focus:border-[var(--color-primary)]',
].join(' ');
export const KB_TAG_FIELD_STYLE = {
    padding: '4px 8px',
    color: 'var(--color-text-primary)',
    fontSize: 12,
} as const;

export const KB_TAG_LIMIT = 'italic';
export const KB_TAG_LIMIT_STYLE = {
    fontSize: 'var(--font-size-xs, 10px)',
    color: 'var(--color-text-muted)',
} as const;
