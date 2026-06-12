import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackDialog } from '../FeedbackDialog';
import * as feedbackService from '../../services/feedbackService';

vi.mock('../../services/feedbackService', () => ({
    submitFeedback: vi.fn(),
}));

vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (sel: (s: { user: { id: string } | null }) => unknown) =>
        sel({ user: { id: 'user-1' } }),
}));

vi.mock('@/shared/services/logger', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('FeedbackDialog', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('does not render when closed', () => {
        render(<FeedbackDialog isOpen={false} onClose={vi.fn()} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders form fields when open', () => {
        render(<FeedbackDialog isOpen onClose={vi.fn()} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('submit button is disabled when message is empty', () => {
        render(<FeedbackDialog isOpen onClose={vi.fn()} />);
        expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });

    it('submit button enables when message has >= 10 chars', () => {
        render(<FeedbackDialog isOpen onClose={vi.fn()} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'This app is great!' } });
        expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled();
    });

    it('calls submitFeedback with userId, selected type and message on submit', async () => {
        vi.mocked(feedbackService.submitFeedback).mockResolvedValue(undefined);
        render(<FeedbackDialog isOpen onClose={vi.fn()} />);
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bug' } });
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Something is broken here!' } });
        fireEvent.click(screen.getByRole('button', { name: /send/i }));
        await waitFor(() =>
            expect(feedbackService.submitFeedback).toHaveBeenCalledWith('user-1', 'bug', 'Something is broken here!')
        );
    });

    it('shows success message after successful submit', async () => {
        vi.mocked(feedbackService.submitFeedback).mockResolvedValue(undefined);
        render(<FeedbackDialog isOpen onClose={vi.fn()} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Great app, really loving it!' } });
        fireEvent.click(screen.getByRole('button', { name: /send/i }));
        await waitFor(() => expect(screen.getByText(/thanks/i)).toBeInTheDocument());
    });

    it('shows error message when submitFeedback throws', async () => {
        vi.mocked(feedbackService.submitFeedback).mockRejectedValue(new Error('network'));
        render(<FeedbackDialog isOpen onClose={vi.fn()} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Some feedback here!' } });
        fireEvent.click(screen.getByRole('button', { name: /send/i }));
        await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(<FeedbackDialog isOpen onClose={onClose} />);
        fireEvent.click(screen.getByLabelText(/close/i));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('shows submitting state while in-flight', async () => {
        vi.mocked(feedbackService.submitFeedback).mockReturnValue(new Promise(() => { /* never resolves */ }));
        render(<FeedbackDialog isOpen onClose={vi.fn()} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Some feedback here now!' } });
        fireEvent.click(screen.getByRole('button', { name: /send/i }));
        await waitFor(() => expect(screen.getByText(/sending/i)).toBeInTheDocument());
    });
});
