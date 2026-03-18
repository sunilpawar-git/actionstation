/**
 * ConnectorStylePicker Tailwind classes and style objects.
 * Consumed by: ConnectorStylePicker.tsx
 */
import type { CSSProperties } from 'react';

export const CSP_CONTAINER =
    'flex flex-col border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden';

export const CSP_OPTION =
    'flex items-center text-[length:var(--font-size-sm)] cursor-pointer border-b border-[var(--color-border)] last:border-b-0 transition-[background] duration-[var(--transition-fast)]';
export const CSP_OPTION_STYLE: CSSProperties = {
    gap: 'var(--space-sm)',
    padding: 'var(--space-sm) var(--space-md)',
    color: 'var(--color-text-secondary)',
};

export const CSP_OPTION_ACTIVE_STYLE: CSSProperties = {
    ...CSP_OPTION_STYLE,
    background: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    fontWeight: 'var(--font-weight-medium)',
};

export const CSP_HIDDEN_RADIO = 'sr-only';

export const CSP_PREVIEW = 'flex items-center shrink-0';

export const CSP_LABEL = 'flex-1';

export const CSP_CHECKMARK = 'text-[length:var(--font-size-xs)]';
export const CSP_CHECKMARK_STYLE: CSSProperties = { color: 'var(--color-primary)' };
