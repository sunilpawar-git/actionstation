/**
 * ToolbarSection Tailwind classes and style objects.
 * Consumed by: ToolbarSection, IconItem, ToolbarZoneList, UnplacedIconsPool
 */
import type { CSSProperties } from 'react';

/* ─── Zone header ─── */
export const TB_ZONE_HEADER = 'flex items-center justify-between';
export const TB_ZONE_HEADER_STYLE: CSSProperties = {
    marginTop: 'var(--space-md)',
    marginBottom: 0,
};

export const TB_SUBHEADING =
    'text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)] uppercase tracking-[0.05em]';
export const TB_SUBHEADING_STYLE: CSSProperties = {
    color: 'var(--color-text-secondary)',
    margin: 0,
};

export const TB_CAPACITY_BADGE =
    'text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)] rounded-[var(--radius-sm)] border border-[var(--color-border)]';
export const TB_CAPACITY_BADGE_STYLE: CSSProperties = {
    color: 'var(--color-text-muted)',
    background: 'var(--color-surface-elevated)',
    padding: 'var(--space-xxs) var(--space-sm)',
};
export const TB_CAPACITY_BADGE_FULL_STYLE: CSSProperties = {
    color: 'var(--color-warning)',
    borderColor: 'var(--color-warning)',
    background: 'var(--color-warning-bg)',
    padding: 'var(--space-xxs) var(--space-sm)',
};

/* ─── Zone hint / more note ─── */
export const TB_ZONE_HINT = 'text-[length:var(--font-size-xs)] italic';
export const TB_ZONE_HINT_STYLE: CSSProperties = {
    color: 'var(--color-text-muted)',
    margin: 'var(--space-xxs) 0 var(--space-xs) 0',
};

export const TB_MORE_NOTE =
    'text-[length:var(--font-size-xs)] rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)]';
export const TB_MORE_NOTE_STYLE: CSSProperties = {
    color: 'var(--color-text-muted)',
    margin: 'var(--space-xs) 0 0 0',
    padding: 'var(--space-xs) var(--space-sm)',
    background: 'var(--color-surface-elevated)',
};

/* ─── Button list (shared zone container) ─── */
export const TB_BUTTON_LIST =
    'flex flex-col rounded-[var(--radius-md)] border border-[var(--color-border)] min-h-[48px] transition-[border-color] duration-[var(--transition-fast)]';
export const TB_BUTTON_LIST_STYLE: CSSProperties = {
    gap: 'var(--space-xxs)',
    background: 'var(--color-surface)',
    padding: 'var(--space-xs)',
};

export const TB_DROP_ZONE_ACTIVE =
    'border-[var(--color-primary)] shadow-[inset_0_0_0_1px_var(--color-primary-light)]';

/* ─── Button item (icon row) ─── */
export const TB_BUTTON_ITEM =
    'flex items-center rounded-[var(--radius-sm)] border border-transparent cursor-grab select-none transition-all duration-[var(--transition-fast)] active:cursor-grabbing';
export const TB_BUTTON_ITEM_STYLE: CSSProperties = {
    gap: 'var(--space-sm)',
    padding: 'var(--space-sm)',
    background: 'var(--color-surface-elevated)',
};

export const TB_DRAGGING = 'opacity-40 scale-[0.98]';

export const TB_DROP_TARGET =
    'border-[var(--color-primary)] shadow-[0_0_0_2px_var(--color-primary-light)]';
export const TB_DROP_TARGET_STYLE: CSSProperties = {
    background: 'var(--color-primary-light)',
};

/* ─── Drag handle / icon / label / actions ─── */
export const TB_DRAG_HANDLE = 'shrink-0 w-4 text-center text-sm leading-none cursor-grab';
export const TB_DRAG_HANDLE_STYLE: CSSProperties = { color: 'var(--color-text-muted)' };

export const TB_BUTTON_ICON = 'shrink-0 w-6 text-center text-base leading-none';

export const TB_BUTTON_LABEL = 'flex-1 text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]';
export const TB_BUTTON_LABEL_STYLE: CSSProperties = { color: 'var(--color-text-primary)' };

export const TB_BUTTON_ACTIONS = 'flex items-center shrink-0';
export const TB_BUTTON_ACTIONS_STYLE: CSSProperties = { gap: 'var(--space-xxs)' };

/* ─── Action button (up/down/remove) ─── */
export const TB_ACTION_BTN =
    'w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-xs cursor-pointer transition-all duration-[var(--transition-fast)] border-none';
export const TB_ACTION_BTN_STYLE: CSSProperties = {
    color: 'var(--color-text-muted)',
    background: 'transparent',
    padding: 0,
};

export const TB_ACTION_BTN_DISABLED_STYLE: CSSProperties = {
    ...TB_ACTION_BTN_STYLE,
    opacity: 0.3,
    cursor: 'not-allowed',
};

/* ─── Hidden zone (unplaced pool) ─── */
export const TB_HIDDEN_ZONE =
    'flex flex-col rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-border)] min-h-[48px] transition-all duration-[var(--transition-fast)]';
export const TB_HIDDEN_ZONE_STYLE: CSSProperties = {
    gap: 'var(--space-xxs)',
    background: 'var(--color-surface)',
    padding: 'var(--space-sm)',
};

export const TB_HIDDEN_ZONE_ACTIVE = 'border-[var(--color-primary)]';
export const TB_HIDDEN_ZONE_ACTIVE_STYLE: CSSProperties = {
    background: 'var(--color-primary-light)',
};

export const TB_EMPTY_HINT = 'text-[length:var(--font-size-xs)] text-center italic';
export const TB_EMPTY_HINT_STYLE: CSSProperties = {
    color: 'var(--color-text-muted)',
    padding: 'var(--space-sm)',
};

/* ─── Hidden item (unplaced icon row) ─── */
export const TB_HIDDEN_ITEM =
    'flex items-center rounded-[var(--radius-sm)] opacity-70 cursor-grab select-none transition-all duration-[var(--transition-fast)] hover:opacity-100';
export const TB_HIDDEN_ITEM_STYLE: CSSProperties = {
    gap: 'var(--space-sm)',
    padding: 'var(--space-xs) var(--space-sm)',
    background: 'var(--color-surface-elevated)',
};

export const TB_ADD_BUTTONS = 'flex shrink-0';
export const TB_ADD_BUTTONS_STYLE: CSSProperties = { marginLeft: 'auto', gap: 'var(--space-xs)' };

export const TB_ADD_BTN =
    'rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)] cursor-pointer transition-all duration-[var(--transition-fast)] whitespace-nowrap';
export const TB_ADD_BTN_STYLE: CSSProperties = {
    padding: 'var(--space-xs) var(--space-sm)',
    background: 'transparent',
    color: 'var(--color-primary)',
    border: '1px solid var(--color-border)',
};

export const TB_ADD_BTN_DISABLED_STYLE: CSSProperties = {
    ...TB_ADD_BTN_STYLE,
    opacity: 0.4,
    cursor: 'not-allowed',
    color: 'var(--color-text-muted)',
};

