/**
 * UpgradeWall — Modal shown when free users hit a quantitative limit.
 * Displays limit-specific message with current/max counts and upgrade CTA.
 * All text from strings.subscription.limits.* — no hardcoded strings.
 */
import { strings } from '@/shared/localization/strings';
import type { LimitKind } from '../types/tierLimits';

interface UpgradeWallProps {
    readonly limitKind: LimitKind;
    readonly current: number;
    readonly max: number;
    readonly onDismiss: () => void;
    readonly onUpgrade?: () => void;
}

const LIMIT_MESSAGES: Record<LimitKind, string> = {
    workspace: strings.subscription.limits.workspaceLimit,
    node: strings.subscription.limits.nodeLimit,
    aiDaily: strings.subscription.limits.aiDailyLimit,
    storage: strings.subscription.limits.storageLimit,
};

export function UpgradeWall({ limitKind, current, max, onDismiss, onUpgrade }: UpgradeWallProps) {
    const message = LIMIT_MESSAGES[limitKind];
    const displayMax = Number.isFinite(max) ? max : '∞';

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-[var(--color-overlay)] z-[var(--z-modal)]"
            role="dialog"
            aria-modal="true"
            aria-label={strings.subscription.upgradeTitle}
        >
            <div
                className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-xl)] max-w-[400px] w-[90%] shadow-[var(--shadow-xl)] text-center overflow-clip"
                style={{ padding: 'var(--space-xl)' }}
            >
                <h3
                    className="font-semibold text-[var(--color-text-primary)]"
                    style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-sm)' }}
                >
                    {strings.subscription.upgradeTitle}
                </h3>
                <p
                    className="text-[var(--color-text-secondary)] leading-[var(--line-height-relaxed)]"
                    style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-sm)' }}
                >
                    {message}
                </p>
                <p
                    className="text-[var(--color-text-muted)] font-medium"
                    style={{ fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-lg)' }}
                >
                    {current}/{displayMax} &middot; {strings.subscription.limits.upgradeForMore}
                </p>
                <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
                    <button
                        className="text-[var(--header-text)] border-none rounded-md font-medium cursor-pointer transition-colors duration-150 ease-in-out"
                        style={{ background: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', padding: 'var(--space-sm) var(--space-lg)' }}
                        onClick={onUpgrade}
                    >
                        {strings.subscription.upgradeCta}
                    </button>
                    <button
                        className="border-none text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)]"
                        style={{ background: 'transparent', fontSize: 'var(--font-size-sm)', padding: 'var(--space-xs)' }}
                        onClick={onDismiss}
                    >
                        {strings.subscription.dismissUpgrade}
                    </button>
                </div>
            </div>
        </div>
    );
}
