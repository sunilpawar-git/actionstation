/**
 * HeroSection — Unit tests
 * TDD: written before implementation.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }),
});

describe('HeroSection', () => {
    it('renders the hero title from strings', async () => {
        const { HeroSection } = await import(
            '@/features/landing/components/HeroSection'
        );
        render(<HeroSection />);
        expect(screen.getByText(strings.landing.hero.title)).toBeInTheDocument();
    });

    it('renders the subtitle', async () => {
        const { HeroSection } = await import(
            '@/features/landing/components/HeroSection'
        );
        render(<HeroSection />);
        expect(screen.getByText(strings.landing.hero.subtitle)).toBeInTheDocument();
    });

    it('renders primary CTA linking to /login', async () => {
        const { HeroSection } = await import(
            '@/features/landing/components/HeroSection'
        );
        render(<HeroSection />);
        const cta = screen.getByRole('link', { name: strings.landing.hero.ctaPrimary });
        expect(cta).toHaveAttribute('href', '/login');
    });

    it('renders secondary CTA as anchor to features section', async () => {
        const { HeroSection } = await import(
            '@/features/landing/components/HeroSection'
        );
        render(<HeroSection />);
        const cta = screen.getByRole('link', { name: strings.landing.hero.ctaSecondary });
        expect(cta).toHaveAttribute('href', '#features');
    });

    it('renders the animation container', async () => {
        const { HeroSection } = await import(
            '@/features/landing/components/HeroSection'
        );
        render(<HeroSection />);
        expect(screen.getByLabelText('Animated canvas demo')).toBeInTheDocument();
    });
});
