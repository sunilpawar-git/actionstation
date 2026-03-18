export const KB_ADD_CONTAINER = 'relative';

export const KB_ADD_BUTTON = [
    'flex items-center',
    'border border-[var(--color-border)]',
    'rounded-[var(--radius-md,8px)]',
    'cursor-pointer',
    'transition-[background] duration-150 ease-in-out',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'hover:bg-[var(--color-surface-hover)]',
].join(' ');
export const KB_ADD_BUTTON_STYLE = {
    gap: 4,
    padding: '6px 10px',
    backgroundColor: 'var(--color-surface-elevated)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm, 13px)',
} as const;

export const KB_ADD_ICON_STYLE = { fontSize: 16, lineHeight: 1 } as const;

export const KB_ADD_BADGE = [
    'inline-flex items-center justify-center',
    'rounded-[9px]',
    'font-semibold leading-none',
].join(' ');
export const KB_ADD_BADGE_STYLE = {
    minWidth: 18,
    height: 18,
    padding: '0 4px',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-text-on-primary)',
    fontSize: 11,
} as const;

export const KB_DROPDOWN = [
    'absolute left-0 z-[100]',
    'min-w-[200px]',
    'bg-[var(--color-surface)]',
    'border border-[var(--color-border)]',
    'rounded-[var(--radius-lg,12px)]',
    'shadow-[0_8px_32px_hsla(0,0%,0%,0.25)]',
    'overflow-hidden',
].join(' ');
export const KB_DROPDOWN_STYLE = {
    top: 'calc(100% + 6px)',
    padding: 4,
} as const;

export const KB_DROPDOWN_ITEM = [
    'flex items-center w-full',
    'border-none cursor-pointer',
    'rounded-[var(--radius-sm,6px)]',
    'text-left',
    'transition-[background] duration-100 ease-in-out',
    'hover:bg-[var(--color-surface-hover)]',
].join(' ');
export const KB_DROPDOWN_ITEM_STYLE = {
    gap: 8,
    padding: '8px 12px',
    background: 'none',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm, 13px)',
} as const;

export const KB_DROPDOWN_ICON_STYLE = {
    fontSize: 16, lineHeight: 1, flexShrink: 0,
} as const;

export const KB_DIVIDER = 'h-px bg-[var(--color-border)]';
export const KB_DIVIDER_STYLE = { margin: '4px 8px' } as const;

export const KB_MAX_REACHED = 'flex items-start';
export const KB_MAX_REACHED_STYLE = { gap: 8, padding: '8px 12px' } as const;

export const KB_DROPDOWN_LABEL = 'font-semibold';
export const KB_DROPDOWN_LABEL_STYLE = {
    fontSize: 'var(--font-size-sm, 13px)',
    color: 'var(--color-text-primary)',
} as const;

export const KB_DROPDOWN_HINT_STYLE = {
    fontSize: 'var(--font-size-xs, 11px)',
    color: 'var(--color-text-muted)',
    marginTop: 2,
} as const;

export const KB_HIDDEN_INPUT = 'hidden';
