export const WI_ITEM = [
    'flex items-center',
    'rounded-[var(--radius-md)]',
    'cursor-pointer',
    'transition-colors duration-150 ease-in-out',
    'hover:bg-[var(--color-surface-hover)]',
].join(' ');

export const WI_ITEM_STYLE = {
    padding: 'var(--space-sm)',
} as const;

export const WI_DIVIDER_ITEM = 'cursor-default hover:bg-transparent';

export const WI_ACTIVE = [
    'bg-[var(--color-primary-light)]',
    'text-[var(--color-primary)]',
    'font-[var(--font-weight-semibold)]',
].join(' ');

export const WI_DRAGGING = [
    'shadow-md',
    'bg-[var(--color-surface-hover)]',
    'z-[var(--z-modal)]',
].join(' ');

export const WI_DRAG_HANDLE = [
    'flex items-center justify-center',
    'rounded-[var(--radius-sm)]',
    'text-[var(--color-text-secondary)]',
    'bg-transparent border-none',
    'cursor-grab active:cursor-grabbing',
    'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
    'transition-all duration-150 ease-in-out',
    'shrink-0 touch-none p-0.5 mr-1',
    'hover:bg-[var(--color-surface-active)]',
    'hover:text-[var(--color-text-primary)]',
].join(' ');

export const WI_NAME_INPUT = [
    'flex-1',
    'text-[length:var(--font-size-sm)]',
    'text-[var(--color-text-primary)]',
    'bg-[var(--color-surface)]',
    'border border-[var(--color-primary)]',
    'rounded-[var(--radius-sm)]',
    'outline-none',
].join(' ');

export const WI_NAME_INPUT_STYLE = {
    padding: '2px var(--space-xs)',
} as const;

export const WI_NAME = [
    'flex-1',
    'text-[length:var(--font-size-sm)]',
    'text-[var(--color-text-primary)]',
    'whitespace-nowrap overflow-hidden text-ellipsis',
].join(' ');

export const WI_NODE_COUNT = [
    'text-[length:var(--font-size-xs)]',
    'text-[var(--color-text-secondary)]',
    'font-[var(--font-weight-normal)]',
].join(' ');

export const WI_NODE_COUNT_STYLE = {
    marginLeft: 'var(--space-xs)',
} as const;

export const WI_DIVIDER_LINE = [
    'flex-1 h-0.5 rounded-sm',
    'bg-[var(--color-border)]',
    'cursor-default',
].join(' ');

export const WI_DELETE_DIVIDER_BTN = [
    'absolute',
    'flex items-center justify-center',
    'rounded-[var(--radius-sm)]',
    'text-[var(--color-text-secondary)]',
    'bg-[var(--color-surface)]',
    'border-none cursor-pointer',
    'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
    'group-data-[dragging]:!opacity-0',
    'transition-all duration-150 ease-in-out',
    'z-[2]',
    'hover:bg-[var(--color-error-light)]',
    'hover:text-[var(--color-error)]',
].join(' ');

export const WI_DELETE_DIVIDER_BTN_STYLE = {
    right: 'var(--space-md)',
    padding: 4,
} as const;
