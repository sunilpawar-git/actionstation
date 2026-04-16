/**
 * LandingNav — Sticky navigation bar for the public landing page.
 * Contains logo, section anchor links, and auth CTAs.
 */
import { strings } from '@/shared/localization/strings';

const NAV_LINKS = [
    { label: strings.landing.nav.features, href: '#features' },
    { label: strings.landing.nav.pricing, href: '#pricing' },
    { label: strings.landing.nav.faq, href: '#faq' },
] as const;

/** Sticky top navigation for the landing page. */
export function LandingNav() {
    return (
        <nav
            className="sticky top-0 z-50 w-full backdrop-blur-md border-b border-[var(--color-border)]"
            style={{ backgroundColor: 'var(--color-background)' }}
        >
            <div
                className="flex items-center justify-between max-w-6xl mx-auto"
                style={{ padding: 'var(--space-md) var(--space-xl)' }}
            >
            {/* Logo */}
            <a
                href="/"
                className="font-bold text-[var(--color-text-primary)] no-underline"
                style={{ fontSize: 'var(--font-size-lg)' }}
            >
                {strings.app.name}
            </a>

            {/* Section anchors */}
            <div
                className="hidden md:flex items-center"
                style={{ gap: 'var(--space-lg)' }}
            >
                {NAV_LINKS.map((link) => (
                    <a
                        key={link.href}
                        href={link.href}
                        className="text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)] transition-colors duration-150"
                        style={{ fontSize: 'var(--font-size-sm)' }}
                    >
                        {link.label}
                    </a>
                ))}
            </div>

            {/* Auth CTAs */}
            <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                <a
                    href="/login"
                    className="text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)] transition-colors duration-150"
                    style={{ fontSize: 'var(--font-size-sm)' }}
                >
                    {strings.landing.nav.login}
                </a>
                <a
                    href="/login"
                    className="inline-flex items-center justify-center text-[var(--color-text-on-primary)] no-underline rounded-lg transition-colors duration-150"
                    style={{
                        padding: 'var(--space-sm) var(--space-lg)',
                        fontSize: 'var(--font-size-sm)',
                        background: 'var(--color-primary)',
                    }}
                >
                    {strings.landing.nav.getStarted}
                </a>
            </div>
            </div>
        </nav>
    );
}
