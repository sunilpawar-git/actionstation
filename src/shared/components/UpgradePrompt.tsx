/**
 * UpgradePrompt - Shown when free users try to access pro features
 * All text from strings.subscription.* -- no hardcoded strings.
 */
import { strings } from '@/shared/localization/strings';

interface UpgradePromptProps {
    featureName: string;
    onDismiss: () => void;
    onUpgrade?: () => void;
}

/** Modal prompt shown to free users when they attempt to access a subscription-gated feature. */
export function UpgradePrompt({ featureName, onDismiss, onUpgrade }: UpgradePromptProps) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[hsla(0,0%,0%,0.4)] z-[var(--z-modal)]" role="dialog" aria-modal="true">
            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-[var(--space-xl)] max-w-[400px] w-[90%] shadow-[var(--shadow-xl)] text-center">
                <h3 className="font-semibold text-[var(--color-text-primary)]" style={{ fontSize: 'var(--font-size-lg)', marginBottom: 8 }}>{strings.subscription.upgradeTitle}</h3>
                <p className="text-[var(--color-text-secondary)] leading-[var(--line-height-relaxed)]" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 24 }}>
                    {strings.subscription.upgradeMessage} {featureName}
                </p>
                <div className="flex flex-col" style={{ gap: 8 }}>
                    <button className="text-[var(--header-text)] border-none rounded-md font-medium cursor-pointer transition-colors duration-150 ease-in-out" style={{ background: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', padding: '8px 24px' }} onClick={onUpgrade}>
                        {strings.subscription.upgradeCta}
                    </button>
                    <button className="border-none text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)]" style={{ background: 'transparent', fontSize: 'var(--font-size-sm)', padding: 4 }} onClick={onDismiss}>
                        {strings.subscription.dismissUpgrade}
                    </button>
                </div>
            </div>
        </div>
    );
}
