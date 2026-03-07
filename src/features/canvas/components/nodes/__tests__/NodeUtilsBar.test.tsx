/**
 * NodeUtilsBar Tests — TDD for flat 5-action bar.
 * Primary: AI/Transform | Connect | Copy | Delete | More
 * All labels from string resources. React.memo applied.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';
import { NodeUtilsBar } from '../NodeUtilsBar';

describe('NodeUtilsBar', () => {
    const defaultProps = {
        onAIClick: vi.fn(),
        onConnectClick: vi.fn(),
        onCopyClick: vi.fn(),
        onDelete: vi.fn(),
        onMoreClick: vi.fn(),
        hasContent: true,
        disabled: false,
    };

    describe('renders 5 buttons', () => {
        it('renders Connect button', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.getByLabelText(strings.nodeUtils.connect)).toBeInTheDocument();
        });

        it('renders Copy button', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.getByLabelText(strings.nodeUtils.copy)).toBeInTheDocument();
        });

        it('renders Delete button', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.getByLabelText(strings.nodeUtils.delete)).toBeInTheDocument();
        });

        it('renders More button', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.getByLabelText(strings.nodeUtils.more)).toBeInTheDocument();
        });
    });

    describe('button callbacks', () => {
        it('calls onConnectClick when Connect is clicked', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            fireEvent.click(screen.getByLabelText(strings.nodeUtils.connect));
            expect(defaultProps.onConnectClick).toHaveBeenCalledOnce();
        });

        it('calls onCopyClick when Copy is clicked', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            fireEvent.click(screen.getByLabelText(strings.nodeUtils.copy));
            expect(defaultProps.onCopyClick).toHaveBeenCalledOnce();
        });

        it('calls onDelete when Delete is clicked', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            fireEvent.click(screen.getByLabelText(strings.nodeUtils.delete));
            expect(defaultProps.onDelete).toHaveBeenCalledOnce();
        });

        it('calls onMoreClick when More is clicked', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            fireEvent.click(screen.getByLabelText(strings.nodeUtils.more));
            expect(defaultProps.onMoreClick).toHaveBeenCalledOnce();
        });
    });

    describe('Copy button state', () => {
        it('disables Copy when hasContent is false', () => {
            render(<NodeUtilsBar {...defaultProps} hasContent={false} />);
            expect(screen.getByLabelText(strings.nodeUtils.copy)).toBeDisabled();
        });

        it('enables Copy when hasContent is true', () => {
            render(<NodeUtilsBar {...defaultProps} hasContent={true} />);
            expect(screen.getByLabelText(strings.nodeUtils.copy)).toBeEnabled();
        });
    });

    describe('disabled state', () => {
        it('disables all buttons when disabled prop is true', () => {
            render(<NodeUtilsBar {...defaultProps} disabled={true} />);
            expect(screen.getByLabelText(strings.nodeUtils.connect)).toBeDisabled();
            expect(screen.getByLabelText(strings.nodeUtils.delete)).toBeDisabled();
            expect(screen.getByLabelText(strings.nodeUtils.more)).toBeDisabled();
        });
    });

    describe('a11y', () => {
        it('has role="toolbar" and aria-label', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            const toolbar = screen.getByRole('toolbar');
            expect(toolbar).toHaveAttribute('aria-label', strings.canvas.nodeActionsLabel);
        });

        it('More button has aria-haspopup="true"', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.getByLabelText(strings.nodeUtils.more)).toHaveAttribute('aria-haspopup', 'true');
        });
    });

    describe('all labels from string resources', () => {
        it('labels are from strings.nodeUtils', () => {
            render(<NodeUtilsBar {...defaultProps} />);
            expect(screen.getByLabelText(strings.nodeUtils.connect)).toBeInTheDocument();
            expect(screen.getByLabelText(strings.nodeUtils.copy)).toBeInTheDocument();
            expect(screen.getByLabelText(strings.nodeUtils.delete)).toBeInTheDocument();
            expect(screen.getByLabelText(strings.nodeUtils.more)).toBeInTheDocument();
        });
    });

    describe('React.memo applied', () => {
        it('NodeUtilsBar is memoized', () => {
            expect(NodeUtilsBar.$$typeof).toBe(Symbol.for('react.memo'));
        });
    });
});
