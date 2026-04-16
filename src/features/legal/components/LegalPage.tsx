/**
 * LegalPage — shared layout for Terms of Service and Privacy Policy pages.
 * Public route: accessible regardless of authentication state.
 */
import type { ReactNode } from 'react';
import { strings } from '@/shared/localization/strings';

interface LegalPageProps {
    title: string;
    children: ReactNode;
}

export function LegalPage({ title, children }: LegalPageProps) {
    const handleBack = () => { window.history.back(); };

    return (
        <main
            className="min-h-screen text-[var(--color-text-primary)]"
            style={{ background: 'var(--color-background)' }}
        >
            <div className="w-full max-w-3xl mx-auto" style={{ padding: '32px 24px' }}>

                <div className="flex items-center" style={{ marginBottom: 40 }}>
                    <button
                        className="flex items-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        onClick={handleBack}
                        aria-label={strings.legal.backButtonAriaLabel}
                        style={{ gap: 6, fontSize: 'var(--font-size-sm)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <span aria-hidden="true">←</span>
                        <span>{strings.legal.backButtonLabel}</span>
                    </button>
                </div>

                <h1
                    className="font-bold text-[var(--color-text-primary)]"
                    style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 8, letterSpacing: '-0.02em' }}
                >
                    {title}
                </h1>

                <p
                    className="text-[var(--color-text-muted)]"
                    style={{ fontSize: 'var(--font-size-sm)', marginBottom: 40 }}
                >
                    {strings.legal.lastUpdated} {strings.legal.lastUpdatedValue}
                </p>

                <div style={{ lineHeight: 1.8 }}>
                    {children}
                </div>

            </div>
        </main>
    );
}
