export const KB_GROUP_CARD = [
    'bg-[var(--color-surface-elevated)]',
    'border border-[var(--color-border)]',
    'rounded-[var(--radius-md,10px)]',
    'transition-opacity duration-150 ease-in-out',
].join(' ');
export const KB_GROUP_CARD_STYLE = {
    padding: 'var(--space-sm, 8px) var(--space-md, 16px)',
} as const;

export const KB_GROUP_DISABLED = 'opacity-[var(--opacity-disabled,0.5)]';

export const KB_GROUP_HEADER = 'flex items-center cursor-pointer select-none';
export const KB_GROUP_HEADER_STYLE = { gap: 'var(--space-xs, 4px)' } as const;

export const KB_CHECKBOX = 'shrink-0 cursor-pointer';

export const KB_DOC_ICON = 'shrink-0';
export const KB_DOC_ICON_STYLE = {
    fontSize: 'var(--font-size-sm, 14px)',
    color: 'var(--color-text-muted)',
} as const;

export const KB_GROUP_TITLE = 'flex-1 font-semibold overflow-hidden text-ellipsis whitespace-nowrap';
export const KB_GROUP_TITLE_STYLE = {
    fontSize: 'var(--font-size-sm, 13px)',
    color: 'var(--color-text-primary)',
    margin: 0,
} as const;

export const KB_PARTS_BADGE = [
    'bg-[var(--color-surface-hover)]',
    'rounded-[var(--radius-sm,4px)]',
    'whitespace-nowrap shrink-0',
].join(' ');
export const KB_PARTS_BADGE_STYLE = {
    fontSize: 'var(--font-size-xs, 10px)',
    color: 'var(--color-text-muted)',
    padding: 'var(--space-xxs, 2px) var(--space-xs, 4px)',
} as const;

export const KB_EXPAND_BTN = [
    'border-none cursor-pointer shrink-0',
    'flex items-center',
    'rounded-[var(--radius-sm,4px)]',
    'transition-all duration-150 ease-in-out',
    'hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-secondary)]',
].join(' ');
export const KB_EXPAND_BTN_STYLE = {
    background: 'none',
    fontSize: 'var(--font-size-xs, 10px)',
    color: 'var(--color-text-muted)',
    padding: 'var(--space-xxs, 2px) var(--space-xs, 4px)',
} as const;

export const KB_EXPAND_BTN_OPEN = 'rotate-180';

export const KB_SUMMARY_PREVIEW = [
    'overflow-hidden',
    'line-clamp-2',
].join(' ');
export const KB_SUMMARY_PREVIEW_STYLE = {
    fontSize: 'var(--font-size-xs, 12px)',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.4,
    margin: 'var(--space-xs, 4px) 0 0',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
} as const;

export const KB_GROUP_ACTIONS = 'flex';
export const KB_GROUP_ACTIONS_STYLE = {
    gap: 'var(--space-xs, 4px)',
    marginTop: 'var(--space-xs, 4px)',
} as const;

export const KB_DELETE_BTN = [
    'border-none cursor-pointer',
    'rounded-[var(--radius-sm,4px)]',
    'hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-error)]',
].join(' ');
export const KB_DELETE_BTN_STYLE = {
    background: 'none',
    fontSize: 'var(--font-size-xs, 11px)',
    color: 'var(--color-text-muted)',
    padding: 'var(--space-xxs, 2px) var(--space-xs, 4px)',
} as const;

export const KB_CHILDREN_LIST = 'flex flex-col border-l-2 border-[var(--color-border)]';
export const KB_CHILDREN_LIST_STYLE = {
    marginTop: 'var(--space-xs, 4px)',
    paddingLeft: 'var(--space-md, 16px)',
    gap: 'var(--space-xxs, 2px)',
} as const;
