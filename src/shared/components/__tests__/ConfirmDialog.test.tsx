import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfirmDialog } from '../ConfirmDialog';
import { useConfirmStore, type ConfirmStore } from '@/shared/stores/confirmStore';

describe('ConfirmDialog', () => {
    beforeEach(() => {
        useConfirmStore.setState({
            isOpen: false,
            options: null,
            resolve: null,
        });
    });

    it('renders nothing when the dialog is closed', () => {
        const { container } = render(<ConfirmDialog />);
        expect(container.firstChild).toBeNull();
    });

    it('renders title and message when the dialog is open', () => {
        useConfirmStore.setState({
            isOpen: true,
            options: { title: 'Delete Divider?', message: 'This cannot be undone.' },
            resolve: vi.fn(),
        });

        render(<ConfirmDialog />);

        expect(screen.getByText('Delete Divider?')).toBeInTheDocument();
        expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    });

    it('renders custom confirm and cancel button labels', () => {
        useConfirmStore.setState({
            isOpen: true,
            options: {
                title: 'Delete?',
                message: 'Sure?',
                confirmText: 'Yes, delete it',
                cancelText: 'Keep it',
            },
            resolve: vi.fn(),
        });

        render(<ConfirmDialog />);

        expect(screen.getByText('Yes, delete it')).toBeInTheDocument();
        expect(screen.getByText('Keep it')).toBeInTheDocument();
    });

    it('calls handleConfirm when the confirm button is clicked', () => {
        const handleConfirm = vi.fn();
        const handleCancel = vi.fn();
        useConfirmStore.setState({
            isOpen: true,
            options: { title: 'Delete?', message: 'Sure?' },
            resolve: vi.fn(),
        });
        useConfirmStore.setState({ handleConfirm, handleCancel } as unknown as ConfirmStore);

        render(<ConfirmDialog />);
        fireEvent.click(screen.getByText('Confirm'));
        expect(handleConfirm).toHaveBeenCalled();
    });

    it('calls handleCancel when the cancel button is clicked', () => {
        const handleConfirm = vi.fn();
        const handleCancel = vi.fn();
        useConfirmStore.setState({
            isOpen: true,
            options: { title: 'Delete?', message: 'Sure?' },
            resolve: vi.fn(),
        });
        useConfirmStore.setState({ handleConfirm, handleCancel } as unknown as ConfirmStore);

        render(<ConfirmDialog />);
        fireEvent.click(screen.getByText('Cancel'));
        expect(handleCancel).toHaveBeenCalled();
    });

    it('applies destructive styling when isDestructive is true', () => {
        useConfirmStore.setState({
            isOpen: true,
            options: { title: 'Delete?', message: 'Sure?', isDestructive: true },
            resolve: vi.fn(),
        });

        render(<ConfirmDialog />);

        const confirmButton = screen.getByText('Confirm');
        expect(confirmButton).toHaveStyle({ background: 'var(--color-error)' });
    });
});
