import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceItem } from '@/app/components/WorkspaceItem';

// Mock PinWorkspaceButton to avoid complex dependencies
vi.mock('@/features/workspace/components/PinWorkspaceButton', () => ({
    PinWorkspaceButton: () => <div data-testid="pin-button" />
}));

describe('WorkspaceItem', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    const defaultProps = {
        id: 'ws-1',
        name: 'Test Workspace',
        isActive: false,
        onSelect: vi.fn(),
        onRename: vi.fn(),
    };

    it('renders workspace name', () => {
        render(<WorkspaceItem {...defaultProps} />);
        expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    it('applies active class when isActive is true', () => {
        const { container } = render(<WorkspaceItem {...defaultProps} isActive={true} />);
        const element = container.firstChild as HTMLElement;
        expect(element.className).toContain('bg-[var(--color-primary-light)]');
    });

    it('does not apply active class when isActive is false', () => {
        const { container } = render(<WorkspaceItem {...defaultProps} isActive={false} />);
        const element = container.firstChild as HTMLElement;
        expect(element.className).not.toContain('bg-[var(--color-primary-light)]');
    });

    it('calls onSelect when clicked', () => {
        render(<WorkspaceItem {...defaultProps} />);
        fireEvent.click(screen.getByText('Test Workspace'));
        expect(defaultProps.onSelect).toHaveBeenCalledWith('ws-1');
    });

    it('enters edit mode on double click', () => {
        render(<WorkspaceItem {...defaultProps} />);
        fireEvent.doubleClick(screen.getByText('Test Workspace'));
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveValue('Test Workspace');
    });

    describe('when type is divider', () => {
        const dividerProps = {
            ...defaultProps,
            id: 'div-1',
            name: '---',
            type: 'divider' as const,
        };

        it('does not call onSelect when clicked', () => {
            render(<WorkspaceItem {...dividerProps} />);
            const element = screen.getByTestId('workspace-item');
            fireEvent.click(element);
            expect(defaultProps.onSelect).not.toHaveBeenCalled();
        });

        it('does not enter edit mode on double click', () => {
            render(<WorkspaceItem {...dividerProps} />);
            const dividerDiv = screen.getByTestId('divider-line');
            expect(dividerDiv).toBeInTheDocument();

            fireEvent.doubleClick(dividerDiv);
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });

        it('does not render the Pin button', () => {
            render(<WorkspaceItem {...dividerProps} />);
            expect(screen.queryByTestId('pin-button')).not.toBeInTheDocument();
        });

        it('renders a delete button that calls onDelete when clicked', () => {
            const mockOnDelete = vi.fn();
            render(<WorkspaceItem {...dividerProps} onDelete={mockOnDelete} />);

            const deleteButton = screen.getByLabelText('Delete divider');
            expect(deleteButton).toBeInTheDocument();

            fireEvent.click(deleteButton);
            expect(mockOnDelete).toHaveBeenCalledWith('div-1');
        });
    });
});
