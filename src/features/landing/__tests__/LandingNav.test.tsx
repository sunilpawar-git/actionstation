/**
 * LandingNav — Unit tests
 * TDD: written before implementation.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LandingNav } from '../components/LandingNav';
import { strings } from '@/shared/localization/strings';

describe('LandingNav', () => {
    it('renders a navigation landmark', () => {
        render(<LandingNav />);
        expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('renders the app name', () => {
        render(<LandingNav />);
        expect(screen.getByText(strings.app.name)).toBeInTheDocument();
    });

    it('has a login link pointing to /login', () => {
        render(<LandingNav />);
        const link = screen.getByRole('link', { name: strings.landing.nav.login });
        expect(link).toHaveAttribute('href', '/login');
    });

    it('has anchor links for features, pricing, and faq', () => {
        render(<LandingNav />);
        expect(screen.getByRole('link', { name: strings.landing.nav.features }))
            .toHaveAttribute('href', '#features');
        expect(screen.getByRole('link', { name: strings.landing.nav.pricing }))
            .toHaveAttribute('href', '#pricing');
        expect(screen.getByRole('link', { name: strings.landing.nav.faq }))
            .toHaveAttribute('href', '#faq');
    });

    it('renders a Get Started CTA', () => {
        render(<LandingNav />);
        const cta = screen.getByRole('link', { name: strings.landing.nav.getStarted });
        expect(cta).toHaveAttribute('href', '/login');
    });
});
