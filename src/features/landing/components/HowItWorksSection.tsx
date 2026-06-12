/**
 * HowItWorksSection — 3-step flow explaining the product.
 * All text sourced from landingStrings.
 */
import { strings } from '@/shared/localization/strings';

/** Three-step explanation of the ActionStation workflow. */
export function HowItWorksSection() {
    return (
        <section
            id="how-it-works"
            className="w-full max-w-4xl"
            style={{ padding: 'var(--space-2xl) var(--space-xl)', marginLeft: 'auto', marginRight: 'auto' }}
        >
            <h2
                className="font-bold text-center text-[var(--color-text-primary)]"
                style={{
                    fontSize: 'var(--font-size-xl)',
                    marginBottom: 'var(--space-2xl)',
                }}
            >
                {strings.landing.howItWorks.sectionTitle}
            </h2>
            <ol
                className="grid grid-cols-1 md:grid-cols-3"
                style={{ gap: 'var(--space-xl)', listStyle: 'none', padding: 0, margin: 0 }}
            >
                {strings.landing.howItWorks.steps.map((step, index) => (
                    <li
                        key={step.title}
                        className="flex flex-col items-center text-center"
                        style={{ gap: 'var(--space-sm)' }}
                    >
                        <div
                            className="flex items-center justify-center rounded-full font-bold text-[var(--color-text-on-primary)] w-10 h-10"
                            style={{
                                background: 'var(--color-primary)',
                                fontSize: 'var(--font-size-base)',
                            }}
                        >
                            {index + 1}
                        </div>
                        <h3
                            className="font-semibold text-[var(--color-text-primary)]"
                            style={{ fontSize: 'var(--font-size-base)' }}
                        >
                            {step.title}
                        </h3>
                        <p
                            className="text-[var(--color-text-secondary)]"
                            style={{
                                fontSize: 'var(--font-size-sm)',
                                lineHeight: 1.6,
                            }}
                        >
                            {step.description}
                        </p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
