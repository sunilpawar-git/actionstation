export const CONTROLS_CONTAINER = [
    'flex items-center',
    'bg-[var(--color-surface-elevated)]',
    'border border-[var(--color-border)]',
    'rounded-[var(--radius-md)]',
    'shadow-sm',
].join(' ');

export const CONTROLS_CONTAINER_STYLE = {
    padding: 'var(--space-xs)',
    gap: 'var(--space-xs)',
    marginLeft: 'auto',
} as const;

export const CONTROLS_BUTTON = [
    'flex items-center justify-center',
    'w-8 h-8 rounded-[var(--radius-sm)]',
    'bg-transparent border-none',
    'text-[var(--color-text-secondary)] cursor-pointer',
    'transition-all duration-150 ease-in-out',
    'hover:enabled:bg-[var(--color-surface-hover)]',
    'hover:enabled:text-[var(--color-text-primary)]',
    'disabled:opacity-[var(--opacity-disabled)] disabled:cursor-not-allowed',
].join(' ');

export const CONTROLS_BUTTON_ACTIVE = [
    'bg-[var(--color-primary-light)]',
    'text-[var(--color-primary)]',
].join(' ');

export const CONTROLS_DELETE_BUTTON = [
    'hover:enabled:bg-[var(--color-error-soft)]',
    'hover:enabled:text-[var(--color-error)]',
].join(' ');

export const CONTROLS_POOL_BUTTON = 'relative';

export const CONTROLS_DIVIDER = [
    'w-px h-4',
    'bg-[var(--color-border)]',
].join(' ');

export const CONTROLS_DIVIDER_STYLE = {
    margin: '0 var(--space-xs)',
} as const;
