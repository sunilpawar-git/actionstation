/**
 * SwUpdatePrompt - Notification banner for available PWA updates
 * Renders nothing when no update is available.
 * All text from strings.pwa.* -- no hardcoded strings.
 */
import { strings } from '@/shared/localization/strings';
import type { SwRegistrationResult } from '@/shared/hooks/useSwRegistration';

interface SwUpdatePromptProps {
    registration: SwRegistrationResult;
}

/** PWA update notification banner; renders nothing when no service-worker update is pending. */
export function SwUpdatePrompt({ registration }: SwUpdatePromptProps) {
    const { needRefresh, acceptUpdate, dismissUpdate } = registration;

    if (!needRefresh) {
        return null;
    }

    return (
        <div
            className="fixed flex items-center bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-lg)] z-[var(--z-toast)] animate-[slideUp_var(--transition-normal)]"
            style={{ fontSize: 'var(--font-size-sm)', bottom: 24, right: 24, gap: 16, padding: 16 }}
            role="alert"
        >
            <span className="text-[var(--color-text-primary)]">
                {strings.pwa.updateAvailable}
            </span>
            <div className="flex" style={{ gap: 8 }}>
                <button
                    className="text-[var(--header-text)] border-none rounded-md font-medium cursor-pointer transition-colors duration-150 ease-in-out"
                    style={{ background: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', padding: '4px 16px' }}
                    onClick={acceptUpdate}
                >
                    {strings.pwa.updateNow}
                </button>
                <button
                    className="bg-transparent border-none text-[var(--color-text-secondary)] cursor-pointer transition-colors duration-150 ease-in-out hover:text-[var(--color-text-primary)]"
                    style={{ fontSize: 'var(--font-size-sm)', padding: 4 }}
                    onClick={dismissUpdate}
                >
                    {strings.pwa.dismissUpdate}
                </button>
            </div>
        </div>
    );
}
