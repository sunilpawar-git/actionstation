/**
 * HowItWorksSection — Unit tests
 * TDD: written before implementation.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HowItWorksSection } from '../components/HowItWorksSection';
import { strings } from '@/shared/localization/strings';

describe('HowItWorksSection', () => {
    it('renders with id="how-it-works"', () => {
        render(<HowItWorksSection />);
        expect(document.getElementById('how-it-works')).toBeInTheDocument();
    });

    it('renders the section title', () => {
        render(<HowItWorksSection />);
        expect(screen.getByText(strings.landing.howItWorks.sectionTitle)).toBeInTheDocument();
    });

    it('renders all 3 steps with correct titles', () => {
        render(<HowItWorksSection />);
        for (const step of strings.landing.howItWorks.steps) {
            expect(screen.getByText(step.title)).toBeInTheDocument();
        }
    });

    it('renders all step descriptions', () => {
        render(<HowItWorksSection />);
        for (const step of strings.landing.howItWorks.steps) {
            expect(screen.getByText(step.description)).toBeInTheDocument();
        }
    });
});
