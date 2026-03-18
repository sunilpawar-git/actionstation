/**
 * SettingsGroup — Reusable card wrapper for logically grouped settings.
 * Provides visual boundaries, a title, optional description, and
 * consistent internal spacing across all settings sections.
 */
import type { ReactNode, CSSProperties } from 'react';

interface SettingsGroupProps {
    title: string;
    description?: string;
    variant?: 'default' | 'danger';
    children: ReactNode;
}

const containerBase: CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-md)',
};

const dangerAccent: CSSProperties = {
    ...containerBase,
    borderLeft: '3px solid var(--color-error)',
};

const titleStyle: CSSProperties = {
    color: 'var(--color-text-primary)',
    margin: 0,
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
};

const descStyle: CSSProperties = {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-xs)',
    margin: 0,
};

export function SettingsGroup({ title, description, variant = 'default', children }: SettingsGroupProps) {
    return (
        <div
            className="flex flex-col"
            style={{
                ...(variant === 'danger' ? dangerAccent : containerBase),
                gap: 'var(--space-md)',
            }}
        >
            <div className="flex flex-col" style={{ gap: 'var(--space-xxs)' }}>
                <h4 style={titleStyle}>{title}</h4>
                {description != null && <p style={descStyle}>{description}</p>}
            </div>
            {children}
        </div>
    );
}
