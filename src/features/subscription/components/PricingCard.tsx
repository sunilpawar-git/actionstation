/**
 * PricingCard — displays a single pricing plan (Free or Pro)
 * Shows plan name, price, features, and CTA button.
 * All text from strings.subscription.* — no hardcoded strings.
 *
 * STATUS: Component is complete but not yet integrated into any page.
 * Pending: wire into PricingPage / UpgradeModal once checkout flow is UI-tested.
 */
import { strings } from '@/shared/localization/strings';
import type { PricingPlan } from '../types/subscription';

interface PricingCardProps {
    plan: PricingPlan;
    isCurrent: boolean;
    isPopular?: boolean;
    isLoading: boolean;
    onSelect: (priceId: string) => void;
}

const CARD_BASE = 'relative border rounded-[var(--radius-xl)] text-left transition-shadow duration-150';
const CARD_POPULAR = 'border-[var(--color-primary)] shadow-[0_0_0_1px_var(--color-primary)]';
const CARD_DEFAULT = 'border-[var(--color-border)]';

export function PricingCard({ plan, isCurrent, isPopular, isLoading, onSelect }: PricingCardProps) {
    const s = strings.subscription;
    const interval = plan.interval === 'month' ? s.perMonth : s.perYear;

    return (
        <div
            className={`${CARD_BASE} ${isPopular ? CARD_POPULAR : CARD_DEFAULT}`}
            style={{ padding: 'var(--space-lg)', minWidth: 200, maxWidth: 280 }}
        >
            {isPopular && (
                <span
                    className="absolute top-0 right-0 text-[var(--header-text)] text-xs font-medium rounded-bl-[var(--radius-md)] rounded-tr-[var(--radius-xl)]"
                    style={{ background: 'var(--color-primary)', padding: 'var(--space-xxs) var(--space-sm)' }}
                >
                    {s.mostPopular}
                </span>
            )}

            <h4
                className="font-semibold text-[var(--color-text-primary)]"
                style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-xs)' }}
            >
                {plan.name}
            </h4>

            <div style={{ marginBottom: 'var(--space-md)' }}>
                <span className="font-bold text-[var(--color-text-primary)]" style={{ fontSize: 'var(--font-size-xl)' }}>
                    {plan.displayPrice}
                </span>
                <span className="text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-sm)' }}>
                    {interval}
                </span>
            </div>

            <p
                className="text-[var(--color-text-secondary)] leading-[var(--line-height-relaxed)]"
                style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)' }}
            >
                {plan.interval === 'month' ? s.proFeatures : s.proFeaturesAnnual}
            </p>

            {isCurrent ? (
                <span
                    className="inline-block text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-md font-medium text-center"
                    style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-sm) var(--space-lg)', width: '100%' }}
                >
                    {s.currentPlanBadge}
                </span>
            ) : (
                <button
                    className="text-[var(--header-text)] border-none rounded-md font-medium cursor-pointer transition-colors duration-150 w-full"
                    style={{ background: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', padding: 'var(--space-sm) var(--space-lg)' }}
                    onClick={() => onSelect(plan.priceId)}
                    disabled={isLoading}
                >
                    {isLoading ? strings.common.loading : s.upgradeCta}
                </button>
            )}
        </div>
    );
}
