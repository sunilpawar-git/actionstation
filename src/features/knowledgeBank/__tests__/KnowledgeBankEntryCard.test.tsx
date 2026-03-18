/**
 * KnowledgeBankEntryCard Tests — Entry card behavior
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KnowledgeBankEntryCard } from '../components/KnowledgeBankEntryCard';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';

// Mock icons
vi.mock('@/shared/components/icons', () => ({
    FileTextIcon: () => <div data-testid="icon-text">FileTextIcon</div>,
    ImageIcon: () => <div data-testid="icon-image">ImageIcon</div>,
    EditIcon: () => <div data-testid="icon-edit">EditIcon</div>,
    TrashIcon: () => <div data-testid="icon-trash">TrashIcon</div>,
    PinIcon: () => <div data-testid="icon-pin">PinIcon</div>,
}));

const mockEntry: KnowledgeBankEntry = {
    id: 'kb-1',
    workspaceId: 'ws-1',
    type: 'text',
    title: 'Test Entry',
    content: 'This is test content for the entry card.',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('KnowledgeBankEntryCard', () => {
    const defaultProps = {
        entry: mockEntry,
        onToggle: vi.fn(),
        onUpdate: vi.fn(),
        onDelete: vi.fn(),
        onPin: vi.fn(),
    };

    it('renders entry title', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        expect(screen.getByText('Test Entry')).toBeDefined();
    });

    it('renders content preview', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        expect(screen.getByText('This is test content for the entry card.')).toBeDefined();
    });

    it('shows text icon for text entries', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        expect(screen.getByTestId('icon-text')).toBeDefined();
    });

    it('shows image icon for image entries', () => {
        const imageEntry = { ...mockEntry, type: 'image' as const };
        render(<KnowledgeBankEntryCard {...defaultProps} entry={imageEntry} />);
        expect(screen.getByTestId('icon-image')).toBeDefined();
    });

    it('calls onToggle when checkbox is clicked', () => {
        const onToggle = vi.fn();
        render(<KnowledgeBankEntryCard {...defaultProps} onToggle={onToggle} />);

        const checkbox = screen.getByLabelText('Toggle entry enabled');
        fireEvent.click(checkbox);
        expect(onToggle).toHaveBeenCalledWith('kb-1');
    });

    it('shows edit and delete buttons', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        expect(screen.getByLabelText('Edit entry')).toBeDefined();
        expect(screen.getByLabelText('Delete entry')).toBeDefined();
    });

    it('switches to editor when edit is clicked', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Edit entry'));

        // Editor should now be visible with the entry's title
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        expect(input).toBeDefined();
        expect(input.value).toBe('Test Entry');
    });

    it('shows inline confirmation when delete is clicked', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        fireEvent.click(screen.getByLabelText('Delete entry'));

        expect(screen.getByText('Delete?')).toBeDefined();
        expect(screen.getByText('Confirm')).toBeDefined();
        expect(screen.getByText('Cancel')).toBeDefined();
    });

    it('calls onDelete when inline confirm is clicked', () => {
        const onDelete = vi.fn();
        render(<KnowledgeBankEntryCard {...defaultProps} onDelete={onDelete} />);

        fireEvent.click(screen.getByLabelText('Delete entry')); // 1. Click trask
        fireEvent.click(screen.getByText('Confirm')); // 2. Click confirm

        expect(onDelete).toHaveBeenCalledWith('kb-1');
    });

    it('cancels delete when cancel is clicked', () => {
        const onDelete = vi.fn();
        render(<KnowledgeBankEntryCard {...defaultProps} onDelete={onDelete} />);

        fireEvent.click(screen.getByLabelText('Delete entry')); // 1. Click trash
        fireEvent.click(screen.getByText('Cancel')); // 2. Click cancel

        // Should return to normal state (Trash icon visible)
        expect(screen.getByLabelText('Delete entry')).toBeDefined();
        expect(onDelete).not.toHaveBeenCalled();
    });

    it('applies entryDisabled class when entry is disabled', () => {
        const disabledEntry = { ...mockEntry, enabled: false };
        const { container } = render(
            <KnowledgeBankEntryCard {...defaultProps} entry={disabledEntry} />
        );
        const card = container.firstChild as HTMLElement;
        expect(card.className).toContain('opacity-50');
    });

    it('does not apply entryDisabled class when entry is enabled', () => {
        const { container } = render(<KnowledgeBankEntryCard {...defaultProps} />);
        const card = container.firstChild as HTMLElement;
        expect(card.className).not.toContain('opacity-50');
    });

    it('renders tags when present', () => {
        const tagEntry = { ...mockEntry, tags: ['react', 'typescript'] };
        render(<KnowledgeBankEntryCard {...defaultProps} entry={tagEntry} />);
        expect(screen.getByText('react')).toBeDefined();
        expect(screen.getByText('typescript')).toBeDefined();
    });

    it('renders chunk badge for child entries', () => {
        const chunkEntry = { ...mockEntry, parentEntryId: 'kb-parent' };
        render(<KnowledgeBankEntryCard {...defaultProps} entry={chunkEntry} />);
        expect(screen.getByText('chunk')).toBeDefined();
    });

    it('shows summarizing badge when isSummarizing is true', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} isSummarizing={true} />);
        expect(screen.getByText('Generating summary...')).toBeDefined();
    });

    it('does not show summarizing badge when isSummarizing is false', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} isSummarizing={false} />);
        expect(screen.queryByText('Generating summary...')).toBeNull();
    });

    it('does not show summarizing badge when isSummarizing is undefined', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        expect(screen.queryByText('Generating summary...')).toBeNull();
    });

    // ── Pin feature tests ──────────────────────────────
    it('shows pin button with correct aria-label when unpinned', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        expect(screen.getByLabelText('Pin to always include in AI context')).toBeDefined();
    });

    it('shows unpin aria-label when entry is pinned', () => {
        const pinnedEntry = { ...mockEntry, pinned: true };
        render(<KnowledgeBankEntryCard {...defaultProps} entry={pinnedEntry} />);
        expect(screen.getByLabelText('Unpin entry')).toBeDefined();
    });

    it('calls onPin when pin button is clicked', () => {
        const onPin = vi.fn();
        render(<KnowledgeBankEntryCard {...defaultProps} onPin={onPin} />);
        fireEvent.click(screen.getByLabelText('Pin to always include in AI context'));
        expect(onPin).toHaveBeenCalledWith('kb-1');
    });

    it('renders pinned badge when entry is pinned', () => {
        const pinnedEntry = { ...mockEntry, pinned: true };
        render(<KnowledgeBankEntryCard {...defaultProps} entry={pinnedEntry} />);
        expect(screen.getByText('Pinned')).toBeDefined();
    });

    it('does not render pinned badge when entry is not pinned', () => {
        render(<KnowledgeBankEntryCard {...defaultProps} />);
        expect(screen.queryByText('Pinned')).toBeNull();
    });
});
