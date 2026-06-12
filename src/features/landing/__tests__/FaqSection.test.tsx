/**
 * FaqSection — Unit tests
 * TDD: written before implementation.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FaqSection } from '../components/FaqSection';
import { strings } from '@/shared/localization/strings';

describe('FaqSection', () => {
    it('renders with id="faq"', () => {
        render(<FaqSection />);
        expect(document.getElementById('faq')).toBeInTheDocument();
    });

    it('renders the section title', () => {
        render(<FaqSection />);
        expect(screen.getByText(strings.landing.faq.sectionTitle)).toBeInTheDocument();
    });

    it('renders all 7 FAQ questions', () => {
        render(<FaqSection />);
        for (const item of strings.landing.faq.items) {
            expect(screen.getByRole('button', { name: item.question })).toBeInTheDocument();
        }
    });

    it('clicking a question reveals its answer', () => {
        render(<FaqSection />);
        const firstQuestion = strings.landing.faq.items[0].question;
        const firstAnswer = strings.landing.faq.items[0].answer;

        fireEvent.click(screen.getByRole('button', { name: firstQuestion }));
        expect(screen.getByText(firstAnswer)).toBeInTheDocument();
    });

    it('clicking another question closes the first', () => {
        render(<FaqSection />);
        const firstQuestion = strings.landing.faq.items[0].question;
        const firstAnswer = strings.landing.faq.items[0].answer;
        const secondQuestion = strings.landing.faq.items[1].question;
        const secondAnswer = strings.landing.faq.items[1].answer;

        fireEvent.click(screen.getByRole('button', { name: firstQuestion }));
        expect(screen.getByText(firstAnswer)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: secondQuestion }));
        // Element stays in DOM but is hidden (aria-controls requires a valid DOM target)
        expect(screen.getByText(firstAnswer)).not.toBeVisible();
        expect(screen.getByText(secondAnswer)).toBeVisible();
    });
});
