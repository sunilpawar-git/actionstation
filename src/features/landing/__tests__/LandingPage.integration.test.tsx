/**
 * LandingPage integration test — verifies all sections render in correct order.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mock matchMedia for prefers-reduced-motion
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }),
});

describe('LandingPage integration', () => {
    it('renders all sections in the correct order', async () => {
        const { LandingPage } = await import(
            '@/features/landing/components/LandingPage'
        );
        const { container } = render(<LandingPage />);

        // Verify navigation, main content, and footer landmarks
        expect(container.querySelector('nav')).toBeInTheDocument();
        expect(container.querySelector('main')).toBeInTheDocument();
        expect(container.querySelector('footer')).toBeInTheDocument();

        // Verify all section IDs exist
        expect(container.querySelector('#features')).toBeInTheDocument();
        expect(container.querySelector('#how-it-works')).toBeInTheDocument();
        expect(container.querySelector('#pricing')).toBeInTheDocument();
        expect(container.querySelector('#faq')).toBeInTheDocument();

        // Verify order: sections appear in DOM order
        const main = container.querySelector('main');
        if (!main) throw new Error('main element not found');

        const sectionIds = Array.from(main.querySelectorAll('section[id]'))
            .map((el) => el.id);
        expect(sectionIds).toEqual(['features', 'how-it-works', 'pricing', 'faq']);
    });

    it('renders the animated canvas demo SVG', async () => {
        const { LandingPage } = await import(
            '@/features/landing/components/LandingPage'
        );
        const { container } = render(<LandingPage />);
        const svg = container.querySelector('svg[aria-label="Animated canvas demo"]');
        expect(svg).toBeInTheDocument();
    });
});
