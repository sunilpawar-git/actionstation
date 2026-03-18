/**
 * SettingsPanel shared Tailwind classes and style objects.
 * Consumed by: SettingsPanel, AccountSection, AboutSection, AppearanceSection,
 * CanvasSection, ToolbarSection, KeyboardSection, AIMemorySection.
 */
import type { CSSProperties } from 'react';

/* ─── Overlay / Backdrop / Panel ─── */
export const SP_OVERLAY = 'fixed inset-0 z-[var(--z-modal)] flex items-center justify-center';

export const SP_BACKDROP = 'absolute inset-0 backdrop-blur-[4px]';
export const SP_BACKDROP_STYLE: CSSProperties = {
    background: 'var(--color-backdrop, hsla(220, 13%, 13%, 0.5))',
};

export const SP_PANEL =
    'relative w-[760px] h-[600px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-clip rounded-[var(--radius-xl)] settings-panel-responsive';
export const SP_PANEL_STYLE: CSSProperties = {
    background: 'var(--color-surface-elevated)',
    boxShadow: 'var(--shadow-xl)',
};

/* ─── Header ─── */
export const SP_HEADER = 'flex items-center justify-between border-b border-[var(--color-border)]';
export const SP_HEADER_STYLE: CSSProperties = { padding: 'var(--space-lg)' };

export const SP_TITLE = 'font-[var(--font-weight-semibold)] text-[length:var(--font-size-xl)]';
export const SP_TITLE_STYLE: CSSProperties = {
    color: 'var(--color-text-primary)',
    margin: 0,
};

export const SP_CLOSE_BTN =
    'flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-2xl leading-none transition-all duration-[var(--transition-fast)] cursor-pointer border-none';
export const SP_CLOSE_BTN_STYLE: CSSProperties = {
    color: 'var(--color-text-secondary)',
    background: 'transparent',
};

/* ─── Content / Tabs ─── */
export const SP_CONTENT = 'flex flex-col flex-1 overflow-hidden';

export const SP_TABS =
    'flex flex-row items-center border-b border-[var(--color-border)] flex-shrink-0 settings-tabs-responsive';
export const SP_TABS_STYLE: CSSProperties = {
    padding: 0,
    gap: 0,
};

export const SP_TAB =
    'flex flex-1 items-center justify-center whitespace-nowrap text-[length:var(--font-size-sm)] transition-all duration-[var(--transition-fast)] cursor-pointer border-none bg-transparent settings-tab';
export const SP_TAB_STYLE: CSSProperties = {
    gap: 'var(--space-xs)',
    padding: 'var(--space-sm) var(--space-xs)',
    color: 'var(--color-text-secondary)',
    borderBottom: '2px solid transparent',
};

export const SP_TAB_ACTIVE_STYLE: CSSProperties = {
    gap: 'var(--space-xs)',
    padding: 'var(--space-sm) var(--space-xs)',
    color: 'var(--color-primary)',
    fontWeight: 'var(--font-weight-medium)',
    borderBottom: '2px solid var(--color-primary)',
};

export const SP_SECTION_CONTENT = 'flex-1 overflow-y-auto settings-section-responsive';
export const SP_SECTION_CONTENT_STYLE: CSSProperties = { padding: 'var(--space-lg)' };

/* ─── Section ─── */
export const SP_SECTION = 'flex flex-col';
export const SP_SECTION_STYLE: CSSProperties = { gap: 'var(--space-md)' };

/* ─── Setting description ─── */
export const SP_SETTING_DESC = 'text-[length:var(--font-size-xs)]';
export const SP_SETTING_DESC_STYLE: CSSProperties = {
    color: 'var(--color-text-muted)',
    margin: 0,
};

/* ─── Slider group ─── */
export const SP_SLIDER_GROUP = 'flex items-center';
export const SP_SLIDER_GROUP_STYLE: CSSProperties = { gap: 'var(--space-md)' };

export const SP_SLIDER_VALUE = 'text-[length:var(--font-size-sm)] text-right min-w-[80px]';
export const SP_SLIDER_VALUE_STYLE: CSSProperties = { color: 'var(--color-text-secondary)' };

/* ─── AI Memory ─── */
export const SP_MEMORY_INFO = 'flex items-center justify-between';
export const SP_MEMORY_INFO_STYLE: CSSProperties = { gap: 'var(--space-md)' };

export const SP_MEMORY_COUNT = 'text-[length:var(--font-size-sm)]';
export const SP_MEMORY_COUNT_STYLE: CSSProperties = { color: 'var(--color-text-secondary)' };

export const SP_CLEAR_BTN =
    'rounded-[var(--radius-md)] text-[length:var(--font-size-xs)] cursor-pointer transition-all duration-[var(--transition-fast)] settings-btn-secondary';
export const SP_CLEAR_BTN_STYLE: CSSProperties = {
    padding: 'var(--space-xs) var(--space-sm)',
    background: 'transparent',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
};

/* ─── Keyboard Shortcuts ─── */
export const SP_SHORTCUT_LIST = 'flex flex-col';
export const SP_SHORTCUT_LIST_STYLE: CSSProperties = { gap: 'var(--space-sm)' };

export const SP_SHORTCUT_ITEM =
    'flex justify-between items-center border-b border-[var(--color-border)] last:border-b-0';
export const SP_SHORTCUT_ITEM_STYLE: CSSProperties = { padding: 'var(--space-sm) 0' };

export const SP_SHORTCUT_ACTION = 'text-[length:var(--font-size-sm)]';
export const SP_SHORTCUT_ACTION_STYLE: CSSProperties = { color: 'var(--color-text-primary)' };

export const SP_SHORTCUT_KEYS =
    'text-[length:var(--font-size-xs)] rounded-[var(--radius-sm)] border border-[var(--color-border)]';
export const SP_SHORTCUT_KEYS_STYLE: CSSProperties = {
    fontFamily: 'var(--font-family)',
    padding: 'var(--space-xs) var(--space-sm)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-secondary)',
};

/* ─── Standardized Button Variants ─── */
export const SP_BTN_BASE =
    'w-fit rounded-[var(--radius-md)] text-[length:var(--font-size-sm)] cursor-pointer transition-all duration-[var(--transition-fast)]';

export const SP_BTN_SECONDARY = `${SP_BTN_BASE} settings-btn-secondary`;
export const SP_BTN_SECONDARY_STYLE: CSSProperties = {
    padding: 'var(--space-sm) var(--space-md)',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
};

export const SP_BTN_DANGER = `${SP_BTN_BASE} settings-btn-danger`;
export const SP_BTN_DANGER_STYLE: CSSProperties = {
    padding: 'var(--space-sm) var(--space-md)',
    background: 'transparent',
    color: 'var(--color-error)',
    border: '1px solid var(--color-error)',
};
