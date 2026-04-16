/**
 * FeaturesSection — Unit tests
 * TDD: written before implementation.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeaturesSection } from '../components/FeaturesSection';
import { strings } from '@/shared/localization/strings';

describe('FeaturesSection', () => {
    it('renders with id="features" for anchor navigation', () => {
        render(<FeaturesSection />);
        expect(document.getElementById('features')).toBeInTheDocument();
    });

    it('renders the section title', () => {
        render(<FeaturesSection />);
        expect(screen.getByText(strings.landing.features.sectionTitle)).toBeInTheDocument();
    });

    it('renders all feature titles', () => {
        render(<FeaturesSection />);
        const features = strings.landing.features;
        expect(screen.getByText(features.canvas.title)).toBeInTheDocument();
        expect(screen.getByText(features.ai.title)).toBeInTheDocument();
        expect(screen.getByText(features.knowledgeBank.title)).toBeInTheDocument();
        expect(screen.getByText(features.contextChains.title)).toBeInTheDocument();
        expect(screen.getByText(features.search.title)).toBeInTheDocument();
        expect(screen.getByText(features.offline.title)).toBeInTheDocument();
    });

    it('renders all feature descriptions', () => {
        render(<FeaturesSection />);
        const features = strings.landing.features;
        expect(screen.getByText(features.canvas.description)).toBeInTheDocument();
        expect(screen.getByText(features.ai.description)).toBeInTheDocument();
    });
});
