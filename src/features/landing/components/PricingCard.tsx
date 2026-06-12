/**
 * PricingCard — Single pricing plan card.
 * Displays plan name, price, feature list, CTA, and optional badge.
 */
import { useId } from 'react';

interface PricingCardProps {
    readonly planName: string;
    readonly price: string;
    readonly features: readonly string[];
    readonly ctaLabel: string;
    readonly ctaHref: string;
    readonly badge?: string;
    readonly highlighted?: boolean;
}

/** Single pricing plan card with feature list and CTA. */
export function PricingCard({
    planName,
    price,
    features,
    ctaLabel,
    ctaHref,
    badge,
    highlighted = false,
}: PricingCardProps) {
    const badgeId = useId();
    const borderColor = highlighted ? 'var(--color-primary)' : 'var(--color-border)';
    return (
        <div
            className="relative flex flex-col rounded-xl border"
            style={{
                padding: 'var(--space-xl)',
                borderColor,
                background: 'var(--color-surface)',
            }}
        >
            {badge && (
                <span
                    id={badgeId}
                    className="absolute top-0 right-0 text-[var(--color-text-on-primary)] font-medium rounded-bl-lg rounded-tr-xl"
                    style={{
                        padding: 'var(--space-xs) var(--space-md)',
                        fontSize: 'var(--font-size-xs)',
                        background: 'var(--color-primary)',
                    }}
                >
                    {badge}
                </span>
            )}
            <h3
                className="font-bold text-[var(--color-text-primary)]"
                style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-xs)' }}
                aria-describedby={badge ? badgeId : undefined}
            >
                {planName}
            </h3>
            <p
                className="font-bold text-[var(--color-text-primary)]"
                style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-lg)' }}
            >
                {price}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: 'var(--space-xl)' }}>
                {features.map((feature) => (
                    <li
                        key={feature}
                        className="flex items-center text-[var(--color-text-secondary)]"
                        style={{
                            fontSize: 'var(--font-size-sm)',
                            padding: 'var(--space-xs) 0',
                            gap: 'var(--space-sm)',
                        }}
                    >
                        <span className="text-[var(--color-success)]" aria-hidden="true">
                            {'\u2713'}
                        </span>
                        {feature}
                    </li>
                ))}
            </ul>
            <a
                href={ctaHref} aria-label={`${ctaLabel} \u2014 ${planName}`}
                className="inline-flex items-center justify-center w-full no-underline rounded-lg font-medium transition-colors duration-150"
                style={{
                    padding: 'var(--space-md)',
                    fontSize: 'var(--font-size-sm)',
                    background: highlighted ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                    color: highlighted ? 'var(--color-text-on-primary)' : 'var(--color-text-primary)',
                    marginTop: 'auto',
                }}
            >
                {ctaLabel}
            </a>
        </div>
    );
}
