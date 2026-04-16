/**
 * LandingPage — Unit tests
 * Verifies the landing page shell renders all sections.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';

// Mock matchMedia for prefers-reduced-motion
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }),
});

describe('LandingPage', () => {
    it('renders the hero title from string resources', async () => {
        const { LandingPage } = await import(
            '@/features/landing/components/LandingPage'
        );
        render(<LandingPage />);
        expect(
            screen.getByText(strings.landing.hero.title),
        ).toBeInTheDocument();
    });

    it('renders as a main landmark', async () => {
        const { LandingPage } = await import(
            '@/features/landing/components/LandingPage'
        );
        render(<LandingPage />);
        expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('renders navigation', async () => {
        const { LandingPage } = await import(
            '@/features/landing/components/LandingPage'
        );
        render(<LandingPage />);
        expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('renders footer', async () => {
        const { LandingPage } = await import(
            '@/features/landing/components/LandingPage'
        );
        render(<LandingPage />);
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });
});
