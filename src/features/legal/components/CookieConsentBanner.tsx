/**
 * CookieConsentBanner — analytics consent banner shown on first visit.
 * Automatically hidden after the user makes a choice or if DNT is set.
 */
import { strings } from '@/shared/localization/strings';
import { useConsentState } from '../hooks/useConsentState';

export function CookieConsentBanner() {
    const { choice, accept, reject } = useConsentState();

    if (choice !== 'pending') return null;

    return (
        <div
            role="region"
            aria-label={strings.legal.consentBannerAriaLabel}
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between flex-wrap text-[var(--color-text-primary)]"
            style={{
                background: 'var(--color-surface-elevated)',
                borderTop: '1px solid var(--color-border)',
                padding: '16px 24px',
                gap: 12,
                boxShadow: '0 -2px 12px hsla(220, 13%, 13%, 0.08)',
            }}
        >
            <p
                className="text-[var(--color-text-secondary)]"
                style={{ fontSize: 'var(--font-size-sm)', flex: 1, minWidth: 240 }}
            >
                {strings.legal.consentBannerMessage}{' '}
                <a
                    href="/privacy"
                    className="underline text-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    style={{ fontSize: 'var(--font-size-sm)' }}
                >
                    {strings.legal.consentLearnMore}
                </a>
            </p>

            <div className="flex items-center" style={{ gap: 8, flexShrink: 0 }}>
                <button
                    aria-label={strings.legal.consentRejectAriaLabel}
                    onClick={reject}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    style={{
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '8px 16px',
                        fontSize: 'var(--font-size-sm)',
                        cursor: 'pointer',
                    }}
                >
                    {strings.legal.consentReject}
                </button>
                <button
                    aria-label={strings.legal.consentAcceptAriaLabel}
                    onClick={accept}
                    className="text-white transition-colors"
                    style={{
                        background: 'var(--color-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '8px 16px',
                        fontSize: 'var(--font-size-sm)',
                        cursor: 'pointer',
                    }}
                >
                    {strings.legal.consentAccept}
                </button>
            </div>
        </div>
    );
}
