export const KB_ENTRY_TAGS = 'flex flex-wrap';
export const KB_ENTRY_TAGS_STYLE = { gap: 3, marginBottom: 6 } as const;

export const KB_ENTRY_TAG_PILL = [
    'inline-block',
    'bg-[var(--color-surface-hover)]',
    'rounded-[var(--radius-sm,10px)]',
    'text-[length:var(--font-size-xs,10px)]',
].join(' ');
export const KB_ENTRY_TAG_PILL_STYLE = {
    padding: '1px 6px',
    color: 'var(--color-text-muted)',
} as const;
