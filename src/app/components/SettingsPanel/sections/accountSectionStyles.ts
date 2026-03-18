/**
 * AccountSection + AboutSection Tailwind classes and style objects.
 * Button variants moved to settingsPanelStyles.ts (SP_BTN_SECONDARY / SP_BTN_DANGER).
 * Consumed by: AccountSection.tsx, AboutSection.tsx
 */
import type { CSSProperties } from 'react';

/* ─── Account info ─── */
export const ACCT_INFO = 'flex items-center';
export const ACCT_INFO_STYLE: CSSProperties = { gap: 'var(--space-md)' };

export const ACCT_AVATAR = 'w-12 h-12 rounded-full object-cover';

export const ACCT_AVATAR_PLACEHOLDER =
    'w-12 h-12 rounded-full flex items-center justify-center font-[var(--font-weight-semibold)] text-[length:var(--font-size-lg)]';
export const ACCT_AVATAR_PLACEHOLDER_STYLE: CSSProperties = {
    background: 'var(--color-primary)',
    color: 'var(--color-text-on-primary)',
};

export const ACCT_DETAILS = 'flex flex-col';
export const ACCT_DETAILS_STYLE: CSSProperties = { gap: 'var(--space-xxs)' };

export const ACCT_NAME = 'font-[var(--font-weight-medium)]';
export const ACCT_NAME_STYLE: CSSProperties = { color: 'var(--color-text-primary)' };

export const ACCT_EMAIL = 'text-[length:var(--font-size-sm)]';
export const ACCT_EMAIL_STYLE: CSSProperties = { color: 'var(--color-text-secondary)' };

/* ─── About section ─── */
export const ABOUT_ROW = 'flex justify-between items-center';
export const ABOUT_ROW_STYLE: CSSProperties = { padding: 'var(--space-sm) 0' };

export const ABOUT_LABEL = 'text-[length:var(--font-size-sm)]';
export const ABOUT_LABEL_STYLE: CSSProperties = { color: 'var(--color-text-secondary)' };

export const ABOUT_VALUE = 'text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]';
export const ABOUT_VALUE_STYLE: CSSProperties = { color: 'var(--color-text-primary)' };

export const ABOUT_LINKS = 'flex flex-col';
export const ABOUT_LINKS_STYLE: CSSProperties = { gap: 'var(--space-sm)' };

export const ABOUT_LINK =
    'text-[length:var(--font-size-sm)] no-underline transition-colors duration-[var(--transition-fast)] cursor-pointer border-none bg-transparent text-left';
export const ABOUT_LINK_STYLE: CSSProperties = { color: 'var(--color-primary)' };
