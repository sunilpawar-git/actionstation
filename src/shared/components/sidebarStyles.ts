export const SB_SIDEBAR = [
    'sidebar',
    'w-[var(--sidebar-width)] h-screen',
    'bg-[var(--color-surface)]',
    'border-r border-[var(--color-border)]',
    'flex flex-col shrink-0',
].join(' ');

export const SB_HEADER = [
    'flex items-center',
    'border-b border-[var(--color-border)]',
].join(' ');

export const SB_HEADER_STYLE = {
    padding: 'var(--space-md) 12px',
    gap: 'var(--space-sm)',
} as const;

export const SB_LOGO = 'flex items-center justify-center';

export const SB_APP_NAME = [
    'text-[length:var(--font-size-lg)]',
    'font-[var(--font-weight-semibold)]',
    'flex-1',
].join(' ');

export const SB_APP_NAME_STYLE = {
    color: 'var(--color-primary)',
} as const;

export const SB_PIN_TOGGLE = [
    'flex items-center justify-center',
    'w-[var(--pin-button-size)] h-[var(--pin-button-size)]',
    'rounded-[var(--radius-sm)]',
    'text-[var(--color-text-secondary)]',
    'bg-transparent shrink-0',
    'transition-all duration-150 ease-in-out',
    'hover:bg-[var(--color-surface-hover)]',
    'hover:text-[var(--color-text-primary)]',
].join(' ');

export const SB_WORKSPACES = 'flex-1 overflow-y-auto';

export const SB_WORKSPACES_STYLE = {
    padding: 'var(--space-md) 12px',
} as const;

export const SB_NEW_WS_WRAPPER = 'flex flex-col w-full';

export const SB_NEW_WS_WRAPPER_STYLE = { gap: 4 } as const;

export const SB_SPLIT_BTN_CONTAINER = 'flex items-stretch w-full';

export const SB_NEW_WS_MAIN = [
    'sidebar-new-ws-btn',
    'flex items-center flex-1',
    'text-[length:var(--font-size-sm)]',
    'font-[var(--font-weight-medium)]',
    'transition-colors duration-150 ease-in-out',
].join(' ');

export const SB_NEW_WS_MAIN_STYLE = {
    gap: 'var(--space-sm)',
    padding: 'var(--space-sm) 12px',
    borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
    color: 'var(--color-text-on-primary)',
    backgroundColor: 'var(--color-primary)',
} as const;

export const SB_SPLIT_DIVIDER = 'w-px bg-white/20';

export const SB_NEW_WS_DROPDOWN_BTN = [
    'sidebar-new-ws-btn',
    'flex items-center justify-center',
    'transition-colors duration-150 ease-in-out',
].join(' ');

export const SB_NEW_WS_DROPDOWN_BTN_STYLE = {
    padding: '0 var(--space-sm)',
    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
    color: 'var(--color-text-on-primary)',
    backgroundColor: 'var(--color-primary)',
} as const;

export const SB_DROPDOWN_MENU = [
    'flex flex-col w-full',
    'bg-[var(--color-surface)]',
    'border border-[var(--color-border)]',
    'rounded-[var(--radius-md)]',
    'shadow-sm',
    'animate-[sidebarSlideDown_0.15s_ease-out_forwards]',
].join(' ');

export const SB_DROPDOWN_MENU_STYLE = {
    padding: 'var(--space-xs)',
} as const;

export const SB_DROPDOWN_ITEM = [
    'flex items-center w-full',
    'rounded-[var(--radius-sm)]',
    'text-[length:var(--font-size-sm)]',
    'text-left',
    'transition-colors duration-150 ease-in-out',
    'hover:bg-[var(--color-surface-hover)]',
].join(' ');

export const SB_DROPDOWN_ITEM_STYLE = {
    padding: 'var(--space-sm) var(--space-md)',
    color: 'var(--color-text-primary)',
} as const;

export const SB_WORKSPACE_LIST = '';

export const SB_WORKSPACE_LIST_STYLE = {
    marginTop: 'var(--space-md)',
} as const;

export const SB_FOOTER = 'border-t border-[var(--color-border)]';

export const SB_FOOTER_STYLE = {
    padding: 'var(--space-md) 12px',
} as const;

export const SB_FOOTER_CONTENT = [
    'flex items-center justify-between',
].join(' ');

export const SB_FOOTER_CONTENT_STYLE = {
    gap: 'var(--space-sm)',
} as const;

export const SB_USER_SECTION = [
    'flex items-center',
    'flex-1 min-w-0',
].join(' ');

export const SB_USER_SECTION_STYLE = {
    gap: 'var(--space-sm)',
} as const;

export const SB_AVATAR = 'w-9 h-9 rounded-full object-cover';

export const SB_AVATAR_PLACEHOLDER = [
    'w-9 h-9 rounded-full',
    'bg-[var(--color-primary)]',
    'flex items-center justify-center',
    'font-[var(--font-weight-semibold)]',
    'text-[length:var(--font-size-sm)]',
].join(' ');

export const SB_AVATAR_PLACEHOLDER_STYLE = {
    color: 'var(--color-text-on-primary)',
} as const;

export const SB_USER_INFO = 'flex flex-col min-w-0';

export const SB_USER_NAME = [
    'text-[length:var(--font-size-sm)]',
    'font-[var(--font-weight-medium)]',
    'whitespace-nowrap overflow-hidden text-ellipsis',
].join(' ');

export const SB_USER_NAME_STYLE = {
    color: 'var(--color-text-primary)',
} as const;

export const SB_SIGN_OUT_BTN = [
    'text-[length:var(--font-size-xs)]',
    'text-left p-0',
    'transition-colors duration-150 ease-in-out',
    'hover:text-[var(--color-error)]',
].join(' ');

export const SB_SIGN_OUT_BTN_STYLE = {
    color: 'var(--color-text-secondary)',
} as const;

export const SB_SETTINGS_BTN = [
    'flex items-center justify-center',
    'w-9 h-9 rounded-[var(--radius-md)]',
    'text-[var(--color-text-secondary)]',
    'bg-transparent shrink-0',
    'transition-all duration-150 ease-in-out',
    'hover:bg-[var(--color-surface-hover)]',
    'hover:text-[var(--color-text-primary)]',
].join(' ');
