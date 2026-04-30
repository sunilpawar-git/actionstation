import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChangelogModal } from '../ChangelogModal';
import * as changelogService from '../../services/changelogService';

vi.mock('../../services/changelogService', () => ({
    markChangelogSeen: vi.fn(),
    hasNewChangelog: vi.fn(() => true),
}));

describe('ChangelogModal', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('does not render when closed', () => {
        render(<ChangelogModal isOpen={false} onClose={vi.fn()} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders the title when open', () => {
        render(<ChangelogModal isOpen onClose={vi.fn()} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/what.s new/i)).toBeInTheDocument();
    });

    it('renders all changelog entries', () => {
        render(<ChangelogModal isOpen onClose={vi.fn()} />);
        expect(screen.getByText(/July 2025/i)).toBeInTheDocument();
        expect(screen.getByText(/June 2025/i)).toBeInTheDocument();
        expect(screen.getByText(/May 2025/i)).toBeInTheDocument();
    });

    it('renders changelog items', () => {
        render(<ChangelogModal isOpen onClose={vi.fn()} />);
        expect(screen.getByText(/Share canvases with a public read-only link/i)).toBeInTheDocument();
    });

    it('calls markChangelogSeen and onClose when dismiss button clicked', () => {
        const onClose = vi.fn();
        render(<ChangelogModal isOpen onClose={onClose} />);
        fireEvent.click(screen.getByText(/got it/i));
        expect(changelogService.markChangelogSeen).toHaveBeenCalledOnce();
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onClose when close icon clicked', () => {
        const onClose = vi.fn();
        render(<ChangelogModal isOpen onClose={onClose} />);
        fireEvent.click(screen.getByLabelText(/close changelog/i));
        expect(onClose).toHaveBeenCalledOnce();
    });
});
