/**
 * LandingFooter — Unit tests
 * TDD: written before implementation.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LandingFooter } from '../components/LandingFooter';
import { strings } from '@/shared/localization/strings';

describe('LandingFooter', () => {
    it('renders a contentinfo landmark', () => {
        render(<LandingFooter />);
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('displays the current year in copyright', () => {
        render(<LandingFooter />);
        const year = new Date().getFullYear().toString();
        expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
    });

    it('has a terms link pointing to /terms', () => {
        render(<LandingFooter />);
        const link = screen.getByRole('link', { name: strings.landing.footer.terms });
        expect(link).toHaveAttribute('href', '/terms');
    });

    it('has a privacy link pointing to /privacy', () => {
        render(<LandingFooter />);
        const link = screen.getByRole('link', { name: strings.landing.footer.privacy });
        expect(link).toHaveAttribute('href', '/privacy');
    });

    it('displays the tagline', () => {
        render(<LandingFooter />);
        expect(screen.getByText(strings.landing.footer.tagline)).toBeInTheDocument();
    });
});
