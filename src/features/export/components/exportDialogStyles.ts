const ACTION_BTN_BASE = [
    'px-[var(--space-md)] py-[var(--space-sm)]',
    'rounded-[var(--radius-md)]',
    'cursor-pointer text-[length:0.8125rem] font-medium',
    'transition-[background] duration-150 ease-[ease]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

export const ACTION_BTN = [
    ACTION_BTN_BASE,
    'border border-[var(--color-border)]',
    'bg-[var(--color-surface)] text-[var(--color-text-primary)]',
    'hover:enabled:bg-[var(--color-surface-elevated)]',
].join(' ');

export const ACTION_BTN_PRIMARY = [
    ACTION_BTN_BASE,
    'border-none',
    'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]',
    'hover:bg-[var(--color-primary-hover)]',
].join(' ');
