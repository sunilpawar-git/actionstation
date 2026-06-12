/**
 * MobileMenu — Mobile navigation drawer for the landing page.
 * Shown below md breakpoint when the hamburger button is toggled.
 */
import { strings } from '@/shared/localization/strings';

interface NavLink {
    readonly label: string;
    readonly href: string;
}

interface MobileMenuProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly navLinks: readonly NavLink[];
}

/** Mobile navigation drawer with section anchors and a CTA. */
export function MobileMenu({ isOpen, onClose, navLinks }: MobileMenuProps) {
    if (!isOpen) return null;
    return (
        <div
            role="navigation"
            aria-label={strings.landing.nav.mobileAriaLabel}
            className="absolute left-0 right-0 top-full md:hidden border-b border-[var(--color-border)]"
            style={{ background: 'var(--color-background)', padding: 'var(--space-md) var(--space-xl)' }}
        >
            <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
                {navLinks.map((link) => (
                    <a
                        key={link.href}
                        href={link.href}
                        onClick={onClose}
                        className="text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)] transition-colors duration-150"
                        style={{ fontSize: 'var(--font-size-base)' }}
                    >
                        {link.label}
                    </a>
                ))}
                <div className="border-t border-[var(--color-border)]" style={{ paddingTop: 'var(--space-md)' }}>
                    <a
                        href="/login"
                        onClick={onClose}
                        className="inline-flex items-center justify-center w-full text-[var(--color-text-on-primary)] no-underline rounded-lg font-medium transition-colors duration-150"
                        style={{ padding: 'var(--space-md)', background: 'var(--color-primary)', fontSize: 'var(--font-size-base)' }}
                    >
                        {strings.landing.nav.getStarted}
                    </a>
                </div>
            </div>
        </div>
    );
}
