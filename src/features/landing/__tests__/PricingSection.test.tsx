/**
 * PricingSection — Unit tests
 * TDD: written before implementation.
 * Validates SSOT: values must come from FREE_TIER_LIMITS, not hardcoded.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PricingSection } from '../components/PricingSection';
import { FREE_TIER_LIMITS } from '@/features/subscription/types/tierLimits';
import { strings } from '@/shared/localization/strings';

describe('PricingSection', () => {
    it('renders with id="pricing"', () => {
        render(<PricingSection />);
        expect(document.getElementById('pricing')).toBeInTheDocument();
    });

    it('renders the section title', () => {
        render(<PricingSection />);
        expect(screen.getByText(strings.landing.pricing.sectionTitle)).toBeInTheDocument();
    });

    it('renders both Free and Pro plan names', () => {
        render(<PricingSection />);
        expect(screen.getByText(strings.landing.pricing.freePlanName)).toBeInTheDocument();
        expect(screen.getByText(strings.landing.pricing.proPlanName)).toBeInTheDocument();
    });

    it('displays free tier workspace limit from SSOT constants', () => {
        render(<PricingSection />);
        // The actual number should come from FREE_TIER_LIMITS, embedded in feature strings
        const text = `${FREE_TIER_LIMITS.maxWorkspaces} ${strings.landing.pricing.labels.workspaces}`;
        expect(screen.getByText(text)).toBeInTheDocument();
    });

    it('displays free tier node limit from SSOT constants', () => {
        render(<PricingSection />);
        const text = `${FREE_TIER_LIMITS.maxNodesPerWorkspace} ${strings.landing.pricing.labels.nodesPerWorkspace}`;
        expect(screen.getByText(text)).toBeInTheDocument();
    });

    it('displays "Unlimited" for Pro tier features', () => {
        render(<PricingSection />);
        const unlimitedItems = screen.getAllByText(new RegExp(`^${strings.landing.pricing.unlimited} `));
        // Pro plan should have 4 "Unlimited ..." rows
        expect(unlimitedItems.length).toBeGreaterThanOrEqual(4);
    });

    it('renders Pro badge', () => {
        render(<PricingSection />);
        expect(screen.getByText(strings.landing.pricing.proBadge)).toBeInTheDocument();
    });
});
