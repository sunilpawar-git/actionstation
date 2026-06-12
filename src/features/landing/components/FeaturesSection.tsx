/**
 * FeaturesSection — Grid of feature highlight cards.
 * All text sourced from landingStrings.
 */
import { strings } from '@/shared/localization/strings';

const FEATURES = [
    strings.landing.features.canvas,
    strings.landing.features.ai,
    strings.landing.features.knowledgeBank,
    strings.landing.features.contextChains,
    strings.landing.features.search,
    strings.landing.features.offline,
] as const;

/** Feature highlights grid with 6 cards. */
export function FeaturesSection() {
    return (
        <section
            id="features"
            className="w-full max-w-6xl"
            style={{ padding: 'var(--space-2xl) var(--space-xl)', marginLeft: 'auto', marginRight: 'auto' }}
        >
            <h2
                className="font-bold text-center text-[var(--color-text-primary)]"
                style={{
                    fontSize: 'var(--font-size-xl)',
                    marginBottom: 'var(--space-2xl)',
                }}
            >
                {strings.landing.features.sectionTitle}
            </h2>
            <ul
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                style={{ gap: 'var(--space-lg)', listStyle: 'none', padding: 0, margin: 0 }}
            >
                {FEATURES.map((feature) => (
                    <li
                        key={feature.title}
                        className="rounded-lg border border-[var(--color-border)]"
                        style={{
                            padding: 'var(--space-lg)',
                            background: 'var(--color-surface)',
                        }}
                    >
                        <h3
                            className="font-semibold text-[var(--color-text-primary)]"
                            style={{
                                fontSize: 'var(--font-size-base)',
                                marginBottom: 'var(--space-sm)',
                            }}
                        >
                            {feature.title}
                        </h3>
                        <p
                            className="text-[var(--color-text-secondary)]"
                            style={{
                                fontSize: 'var(--font-size-sm)',
                                lineHeight: 1.6,
                            }}
                        >
                            {feature.description}
                        </p>
                    </li>
                ))}
            </ul>
        </section>
    );
}
