/**
 * PricingCard — Unit tests
 * TDD: written before implementation.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PricingCard } from '../components/PricingCard';

describe('PricingCard', () => {
    const defaultProps = {
        planName: 'Free',
        price: '$0',
        features: ['5 Workspaces', '12 Nodes per workspace'],
        ctaLabel: 'Get Started',
        ctaHref: '/login',
    };

    it('renders the plan name', () => {
        render(<PricingCard {...defaultProps} />);
        expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('renders the price', () => {
        render(<PricingCard {...defaultProps} />);
        expect(screen.getByText('$0')).toBeInTheDocument();
    });

    it('renders all feature items', () => {
        render(<PricingCard {...defaultProps} />);
        expect(screen.getByText('5 Workspaces')).toBeInTheDocument();
        expect(screen.getByText('12 Nodes per workspace')).toBeInTheDocument();
    });

    it('renders CTA as a link', () => {
        render(<PricingCard {...defaultProps} />);
        // aria-label is "${ctaLabel} — ${planName}" for screen reader clarity
        const cta = screen.getByRole('link', { name: 'Get Started \u2014 Free' });
        expect(cta).toHaveAttribute('href', '/login');
    });

    it('renders badge when provided', () => {
        render(<PricingCard {...defaultProps} badge="Most Popular" />);
        expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });

    it('does not render badge when not provided', () => {
        render(<PricingCard {...defaultProps} />);
        expect(screen.queryByText('Most Popular')).not.toBeInTheDocument();
    });
});
