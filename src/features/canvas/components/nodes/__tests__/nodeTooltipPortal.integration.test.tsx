/**
 * Tooltip Portal Integration Tests — TDD
 * Validates that NodeUtilsBar uses PortalTooltip (not CSS ::after),
 * and that data-tooltip attributes are removed after migration.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeUtilsBar } from '../NodeUtilsBar';

// Mock PortalTooltip to verify it is used (renders in body)
vi.mock('@/shared/components/PortalTooltip', () => ({
    PortalTooltip: ({
        text, shortcut, visible,
    }: { text: string; shortcut?: string; visible: boolean }) => (
        visible ? (
            <div data-testid="portal-tooltip" data-tooltip-text={text}>
                <span>{text}</span>
                {shortcut && <span data-testid="shortcut-hint">{shortcut}</span>}
            </div>
        ) : null
    ),
}));

vi.mock('../NodeUtilsBar.module.css', () => ({
    default: {
        barWrapper: 'barWrapper',
        deckOne: 'deckOne',
        peekIndicator: 'peekIndicator',
    },
}));

vi.mock('../TooltipButton.module.css', () => ({
    default: {
        actionButton: 'actionButton',
        deleteButton: 'deleteButton',
        icon: 'icon',
    },
}));

describe('Tooltip Portal Integration', () => {
    const defaultProps = {
        onAIClick: vi.fn(),
        onConnectClick: vi.fn(),
        onDelete: vi.fn(),
        onMoreClick: vi.fn(),
        disabled: false,
    };

    it('data-tooltip attributes no longer exist on buttons', () => {
        const { container } = render(<NodeUtilsBar {...defaultProps} />);
        const buttonsWithTooltip = container.querySelectorAll('[data-tooltip]');

        expect(buttonsWithTooltip.length).toBe(0);
    });

    it('hovering Connect button shows portal tooltip with correct text', () => {
        render(<NodeUtilsBar {...defaultProps} />);

        fireEvent.mouseEnter(screen.getByLabelText('Connect'));

        const tooltip = screen.getByTestId('portal-tooltip');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveAttribute('data-tooltip-text', 'Connect');
    });

    it('hovering Delete button shows tooltip with shortcut hint', () => {
        render(<NodeUtilsBar {...defaultProps} />);

        fireEvent.mouseEnter(screen.getByLabelText('Delete'));

        expect(screen.getByTestId('portal-tooltip')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
        expect(screen.getByTestId('shortcut-hint')).toBeInTheDocument();
        expect(screen.getByText('⌫')).toBeInTheDocument();
    });

    it('tooltip disappears when mouse leaves button', () => {
        render(<NodeUtilsBar {...defaultProps} />);

        const connectBtn = screen.getByLabelText('Connect');
        fireEvent.mouseEnter(connectBtn);
        expect(screen.getByTestId('portal-tooltip')).toBeInTheDocument();

        fireEvent.mouseLeave(connectBtn);
        expect(screen.queryByTestId('portal-tooltip')).not.toBeInTheDocument();
    });

    it('primary button callbacks work', () => {
        render(<NodeUtilsBar {...defaultProps} />);

        fireEvent.click(screen.getByLabelText('Connect'));
        expect(defaultProps.onConnectClick).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByLabelText('Delete'));
        expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
    });
});
