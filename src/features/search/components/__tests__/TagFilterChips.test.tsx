/**
 * TagFilterChips — Unit Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagFilterChips } from '../TagFilterChips';

describe('TagFilterChips', () => {
    it('renders one chip per availableTag', () => {
        render(<TagFilterChips availableTags={['react', 'vue']} selectedTags={[]} onToggle={() => {}} />);
        expect(screen.getByText('react')).toBeInTheDocument();
        expect(screen.getByText('vue')).toBeInTheDocument();
    });

    it('selected chips have aria-checked="true"', () => {
        render(<TagFilterChips availableTags={['react', 'vue']} selectedTags={['react']} onToggle={() => {}} />);
        expect(screen.getByText('react').closest('button')).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText('vue').closest('button')).toHaveAttribute('aria-checked', 'false');
    });

    it('clicking a chip calls onToggle with correct tag', () => {
        const onToggle = vi.fn();
        render(<TagFilterChips availableTags={['react']} selectedTags={[]} onToggle={onToggle} />);
        fireEvent.click(screen.getByText('react'));
        expect(onToggle).toHaveBeenCalledWith('react');
    });

    it('clicking a selected chip calls onToggle again (deselect)', () => {
        const onToggle = vi.fn();
        render(<TagFilterChips availableTags={['react']} selectedTags={['react']} onToggle={onToggle} />);
        fireEvent.click(screen.getByText('react'));
        expect(onToggle).toHaveBeenCalledWith('react');
    });

    it('empty availableTags renders nothing (no crash)', () => {
        const { container } = render(<TagFilterChips availableTags={[]} selectedTags={[]} onToggle={() => {}} />);
        expect(container.innerHTML).toBe('');
    });
});
