/**
 * FaqItem — Unit tests
 * TDD: written before implementation.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FaqItem } from '../components/FaqItem';

describe('FaqItem', () => {
    const question = 'What is ActionStation?';
    const answer = 'An AI canvas for thinking.';

    it('renders the question as a button', () => {
        render(<FaqItem question={question} answer={answer} isOpen={false} onToggle={() => {}} />);
        expect(screen.getByRole('button', { name: question })).toBeInTheDocument();
    });

    it('hides the answer when closed', () => {
        render(<FaqItem question={question} answer={answer} isOpen={false} onToggle={() => {}} />);
        // Element stays in DOM (so aria-controls has a valid target) but is hidden
        expect(screen.getByText(answer)).not.toBeVisible();
    });

    it('shows the answer when open', () => {
        render(<FaqItem question={question} answer={answer} isOpen={true} onToggle={() => {}} />);
        expect(screen.getByText(answer)).toBeInTheDocument();
    });

    it('has aria-expanded matching open state', () => {
        const { rerender } = render(
            <FaqItem question={question} answer={answer} isOpen={false} onToggle={() => {}} />,
        );
        expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');

        rerender(<FaqItem question={question} answer={answer} isOpen={true} onToggle={() => {}} />);
        expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('calls onToggle when clicked', () => {
        const onToggle = vi.fn();
        render(<FaqItem question={question} answer={answer} isOpen={false} onToggle={onToggle} />);
        fireEvent.click(screen.getByRole('button'));
        expect(onToggle).toHaveBeenCalledOnce();
    });
});
