/* ── Panel ──────────────────────────────────────────────── */

export const KB_PANEL = [
    'fixed top-0 bottom-0 w-[340px]',
    'bg-[var(--color-surface)]',
    'border-r border-[var(--color-border)]',
    'z-[var(--z-modal)]',
    'flex flex-col',
    'shadow-[4px_0_24px_hsla(0,0%,0%,0.15)]',
    'animate-[kbSlideIn_0.2s_ease-out]',
].join(' ');

export const KB_PANEL_HEADER = [
    'flex justify-between items-center',
    'border-b border-[var(--color-border)]',
    'shrink-0',
].join(' ');
export const KB_PANEL_HEADER_STYLE = { padding: 16 } as const;

export const KB_PANEL_TITLE = 'font-semibold';
export const KB_PANEL_TITLE_STYLE = {
    fontSize: 'var(--font-size-md, 15px)',
    color: 'var(--color-text-primary)',
    margin: 0,
} as const;

export const KB_CLOSE_BUTTON = [
    'w-7 h-7',
    'rounded-[var(--radius-sm,6px)]',
    'border-none',
    'flex items-center justify-center',
    'cursor-pointer',
].join(' ');
export const KB_CLOSE_BUTTON_STYLE = {
    backgroundColor: 'var(--color-surface-elevated)',
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-lg, 18px)',
} as const;

export const KB_PANEL_ENTRIES = 'flex-1 overflow-y-auto flex flex-col';
export const KB_PANEL_ENTRIES_STYLE = {
    padding: '8px 16px',
    gap: 8,
} as const;

/* ── Entry Card ────────────────────────────────────────── */

export const KB_ENTRY_CARD = [
    'bg-[var(--color-surface-elevated)]',
    'border border-[var(--color-border)]',
    'rounded-[var(--radius-md,10px)]',
    'transition-opacity duration-150 ease-linear',
].join(' ');
export const KB_ENTRY_CARD_STYLE = { padding: '8px 16px' } as const;

export const KB_ENTRY_DISABLED = 'opacity-50';

export const KB_ENTRY_EDITING = 'border-[var(--color-primary)]';

export const KB_CARD_HEADER_STYLE = { marginBottom: 4 } as const;

export const KB_ENTRY_TITLE_ROW = 'flex items-center';
export const KB_ENTRY_TITLE_ROW_STYLE = { gap: 8 } as const;

export const KB_CHECKBOX = 'shrink-0 cursor-pointer';

export const KB_TYPE_ICON = 'shrink-0';
export const KB_TYPE_ICON_STYLE = {
    fontSize: 'var(--font-size-sm, 14px)',
} as const;

export const KB_ENTRY_TITLE = [
    'flex-1 font-semibold',
    'overflow-hidden text-ellipsis whitespace-nowrap',
].join(' ');
export const KB_ENTRY_TITLE_STYLE = {
    fontSize: 'var(--font-size-sm, 13px)',
    color: 'var(--color-text-primary)',
} as const;

export const KB_ENTRY_PREVIEW = [
    'overflow-hidden',
    'line-clamp-2',
].join(' ');
export const KB_ENTRY_PREVIEW_STYLE = {
    fontSize: 'var(--font-size-xs, 12px)',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.4,
    margin: '0 0 8px',
} as const;

export const KB_ENTRY_ACTIONS = 'flex';
export const KB_ENTRY_ACTIONS_STYLE = { gap: 8 } as const;

export const KB_ACTION_BUTTON = [
    'border-none',
    'cursor-pointer',
    'rounded-[var(--radius-sm,4px)]',
    'hover:bg-[var(--color-surface-hover)]',
].join(' ');
export const KB_ACTION_BUTTON_STYLE = {
    background: 'none',
    fontSize: 'var(--font-size-xs, 11px)',
    color: 'var(--color-text-muted)',
    padding: '2px 4px',
} as const;

export const KB_DELETE_ACTION = 'hover:text-[var(--color-error)]';

export const KB_PIN_ACTION_STYLE = {
    color: 'var(--color-primary)',
} as const;

export const KB_PINNED_BADGE = [
    'bg-[var(--color-surface-hover)]',
    'rounded-[var(--radius-sm,4px)]',
].join(' ');
export const KB_PINNED_BADGE_STYLE = {
    fontSize: 'var(--font-size-xs, 10px)',
    color: 'var(--color-primary)',
    padding: '1px 4px',
    marginLeft: 4,
} as const;

export const KB_CHUNK_BADGE = [
    'bg-[var(--color-surface-hover)]',
    'rounded-[var(--radius-sm,4px)]',
].join(' ');
export const KB_CHUNK_BADGE_STYLE = {
    fontSize: 'var(--font-size-xs, 10px)',
    color: 'var(--color-text-muted)',
    padding: '1px 4px',
    marginLeft: 4,
} as const;

export const KB_SUMMARIZING_BADGE = 'animate-[kbPulse_1.5s_ease-in-out_infinite]';
export const KB_SUMMARIZING_BADGE_STYLE = {
    fontSize: 'var(--font-size-xs, 10px)',
    color: 'var(--color-primary)',
    margin: '0 0 4px',
} as const;

/* ── Edit Mode ─────────────────────────────────────────── */

export const KB_EDIT_INPUT = [
    'w-full h-8',
    'bg-[var(--color-surface)]',
    'border border-[var(--color-border)]',
    'rounded-[var(--radius-sm,6px)]',
    'box-border',
    'focus:outline-none focus:border-[var(--color-primary)]',
].join(' ');
export const KB_EDIT_INPUT_STYLE = {
    padding: '0 8px',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm, 13px)',
    marginBottom: 8,
} as const;

export const KB_EDIT_TEXTAREA = [
    'w-full',
    'bg-[var(--color-surface)]',
    'border border-[var(--color-border)]',
    'rounded-[var(--radius-sm,6px)]',
    'font-[inherit] resize-none',
    'box-border',
    'focus:outline-none focus:border-[var(--color-primary)]',
].join(' ');
export const KB_EDIT_TEXTAREA_STYLE = {
    height: 100,
    padding: 8,
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-xs, 12px)',
    lineHeight: 1.4,
} as const;

export const KB_EDIT_CHAR_COUNT = 'text-right';
export const KB_EDIT_CHAR_COUNT_STYLE = {
    fontSize: 'var(--font-size-xs, 10px)',
    color: 'var(--color-text-muted)',
    margin: '4px 0 8px',
} as const;

export const KB_EDIT_ACTIONS = 'flex justify-end';
export const KB_EDIT_ACTIONS_STYLE = { gap: 8 } as const;

export const KB_EDIT_CANCEL_BUTTON = [
    'border-none',
    'rounded-[var(--radius-sm,6px)]',
    'cursor-pointer',
].join(' ');
export const KB_EDIT_CANCEL_BUTTON_STYLE = {
    backgroundColor: 'var(--color-surface-hover)',
    color: 'var(--color-text-secondary)',
    padding: '4px 8px',
    fontSize: 'var(--font-size-xs, 12px)',
} as const;

export const KB_EDIT_SAVE_BUTTON = [
    'border-none',
    'rounded-[var(--radius-sm,6px)]',
    'font-semibold cursor-pointer',
    'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');
export const KB_EDIT_SAVE_BUTTON_STYLE = {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-text-on-primary)',
    padding: '4px 8px',
    fontSize: 'var(--font-size-xs, 12px)',
} as const;

/* ── Empty State ───────────────────────────────────────── */

export const KB_EMPTY_STATE = 'flex flex-col items-center justify-center text-center';
export const KB_EMPTY_STATE_STYLE = { padding: '48px 24px' } as const;

export const KB_EMPTY_ICON_STYLE = { fontSize: 40, marginBottom: 8 } as const;

export const KB_EMPTY_TEXT = 'font-semibold';
export const KB_EMPTY_TEXT_STYLE = {
    fontSize: 'var(--font-size-sm, 14px)',
    color: 'var(--color-text-primary)',
    margin: '0 0 4px',
} as const;

export const KB_EMPTY_HINT_STYLE = {
    fontSize: 'var(--font-size-xs, 12px)',
    color: 'var(--color-text-muted)',
    margin: 0,
    maxWidth: 240,
    lineHeight: 1.5,
} as const;

/* ── Confirm text (EntryCardActions) ───────────────────── */

export const KB_CONFIRM_TEXT_STYLE = {
    fontSize: 'var(--font-size-xs, 11px)',
    color: 'var(--color-text-muted)',
} as const;
