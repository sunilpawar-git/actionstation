/**
 * Toggle Component Tests — Accessible pill-style switch (single checkbox control)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle } from '../Toggle';

describe('Toggle', () => {
    it('renders the label text', () => {
        render(<Toggle id="test" checked={false} onChange={vi.fn()} label="Enable feature" />);
        expect(screen.getByText('Enable feature')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
        render(
            <Toggle id="test" checked={false} onChange={vi.fn()} label="Feature" description="Some details" />,
        );
        expect(screen.getByText('Some details')).toBeInTheDocument();
    });

    it('does not render description when omitted', () => {
        render(<Toggle id="test" checked={false} onChange={vi.fn()} label="Feature" />);
        expect(screen.queryByText('Some details')).not.toBeInTheDocument();
    });

    it('reflects checked state via aria-checked on the switch', () => {
        const { rerender } = render(
            <Toggle id="test" checked={false} onChange={vi.fn()} label="Feature" />,
        );
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');

        rerender(<Toggle id="test" checked={true} onChange={vi.fn()} label="Feature" />);
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('calls onChange when the switch checkbox is clicked', () => {
        const onChange = vi.fn();
        render(<Toggle id="test" checked={false} onChange={onChange} label="Feature" />);
        fireEvent.click(screen.getByRole('switch'));
        expect(onChange).toHaveBeenCalledOnce();
    });

    it('renders the checkbox as disabled when disabled prop is true', () => {
        render(<Toggle id="test" checked={false} onChange={vi.fn()} label="Feature" disabled />);
        expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('has no <button> element (single control pattern)', () => {
        const { container } = render(
            <Toggle id="test" checked={false} onChange={vi.fn()} label="Feature" />,
        );
        expect(container.querySelector('button')).toBeNull();
    });

    it('links aria-describedby to the description element', () => {
        render(
            <Toggle id="my-toggle" checked={false} onChange={vi.fn()} label="Feature" description="Helpful info" />,
        );
        const switchEl = screen.getByRole('switch');
        expect(switchEl).toHaveAttribute('aria-describedby', 'my-toggle-desc');
        expect(document.getElementById('my-toggle-desc')?.textContent).toBe('Helpful info');
    });

    it('does not set aria-describedby when no description', () => {
        render(<Toggle id="test" checked={false} onChange={vi.fn()} label="Feature" />);
        expect(screen.getByRole('switch')).not.toHaveAttribute('aria-describedby');
    });

    it('toggles via checkbox click', () => {
        const onChange = vi.fn();
        render(<Toggle id="test" checked={false} onChange={onChange} label="Feature" />);
        fireEvent.click(screen.getByRole('switch'));
        expect(onChange).toHaveBeenCalledOnce();
    });

    it('associates label with the checkbox via htmlFor', () => {
        render(<Toggle id="my-toggle" checked={false} onChange={vi.fn()} label="Feature" />);
        const switchEl = screen.getByRole('switch');
        expect(switchEl).toHaveAttribute('id', 'my-toggle');
    });

    it('calls onChange when the label text is clicked', () => {
        const onChange = vi.fn();
        render(<Toggle id="test" checked={false} onChange={onChange} label="Enable feature" />);
        fireEvent.click(screen.getByText('Enable feature'));
        expect(onChange).toHaveBeenCalledOnce();
    });

    it('calls onChange when the description text is clicked', () => {
        const onChange = vi.fn();
        render(
            <Toggle id="test" checked={false} onChange={onChange} label="Feature" description="Some details" />,
        );
        fireEvent.click(screen.getByText('Some details'));
        expect(onChange).toHaveBeenCalledOnce();
    });

    it('does not call onChange when disabled and label is clicked', () => {
        const onChange = vi.fn();
        render(<Toggle id="test" checked={false} onChange={onChange} label="Feature" disabled />);
        fireEvent.click(screen.getByText('Feature'));
        expect(onChange).not.toHaveBeenCalled();
    });
});
