/**
 * NodeHoverMenu Interaction Tests — Flat bar stability, proximity, data-bar-active.
 * Split from NodeHoverMenu.test.tsx to meet 300-line file limit.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';
import { NodeHoverMenu } from '../NodeHoverMenu';

describe('NodeHoverMenu interaction', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const defaultProps = {
        onAIClick: vi.fn(),
        onConnectClick: vi.fn(),
        onDelete: vi.fn(),
        onMoreClick: vi.fn(),
        disabled: false,
    };

    describe('interaction stability regression', () => {
        it('handles rapid interactions without update-depth errors', () => {
            const onTransform = vi.fn();
            render(
                <NodeHoverMenu
                    {...defaultProps}
                    hasContent={true}
                    onTransform={onTransform}
                />
            );

            for (let i = 0; i < 5; i += 1) {
                fireEvent.click(screen.getByLabelText(strings.ideaCard.transform));
                fireEvent.click(screen.getByText(strings.transformations.refine));
                fireEvent.mouseDown(document.body);
            }

            expect(onTransform).toHaveBeenCalled();
        });
    });

    describe('proximity lost — flat bar', () => {
        it('registerProximityLostFn provides a callback', () => {
            let proximityLostFn: (() => void) | null = null;
            render(
                <NodeHoverMenu
                    {...defaultProps}
                    registerProximityLostFn={(fn) => { proximityLostFn = fn; }}
                />
            );

            expect(proximityLostFn).not.toBeNull();
        });

        it('proximityLost does NOT close transform submenu while it is open (hover-gap fix)', () => {
            // When the user clicks the transform button and moves toward the portal
            // dropdown, the card's mouseleave fires. The proximity callback must NOT
            // close the deliberately-opened submenu so the user can click a menu item.
            let proximityLostFn: (() => void) | null = null;
            render(
                <NodeHoverMenu
                    {...defaultProps}
                    hasContent={true}
                    onTransform={vi.fn()}
                    registerProximityLostFn={(fn) => { proximityLostFn = fn; }}
                />
            );

            fireEvent.click(screen.getByLabelText(strings.ideaCard.transform));

            // Verify submenu opened
            const container = screen.getByRole('toolbar').parentElement;
            expect(container?.getAttribute('data-bar-active')).toBe('true');

            // Proximity lost fires (mouse left the card toward the portal)
            act(() => { proximityLostFn?.(); });

            // Submenu MUST remain open — user is still navigating to the dropdown
            expect(container?.getAttribute('data-bar-active')).toBe('true');
        });

        it('proximityLost is a no-op when submenu is already closed', () => {
            let proximityLostFn: (() => void) | null = null;
            render(
                <NodeHoverMenu
                    {...defaultProps}
                    registerProximityLostFn={(fn) => { proximityLostFn = fn; }}
                />
            );

            act(() => { proximityLostFn?.(); });

            const container = screen.getByRole('toolbar').parentElement;
            expect(container?.getAttribute('data-bar-active')).toBeNull();
        });
    });

    describe('CSS data-bar-active attribute', () => {
        it('sets data-bar-active when transform submenu is opened', () => {
            render(
                <NodeHoverMenu {...defaultProps} hasContent onTransform={vi.fn()} />
            );
            const container = screen.getByRole('toolbar').parentElement;
            expect(container).not.toBeNull();

            expect(container!.getAttribute('data-bar-active')).toBeNull();

            fireEvent.click(screen.getByLabelText(strings.ideaCard.transform));

            expect(container!.getAttribute('data-bar-active')).toBe('true');
        });

        it('removes data-bar-active when submenu is closed via outside click', () => {
            render(
                <NodeHoverMenu {...defaultProps} hasContent onTransform={vi.fn()} />
            );
            const container = screen.getByRole('toolbar').parentElement!;

            fireEvent.click(screen.getByLabelText(strings.ideaCard.transform));
            expect(container.getAttribute('data-bar-active')).toBe('true');

            fireEvent.mouseDown(document.body);
            act(() => { vi.advanceTimersByTime(0); });

            expect(container.getAttribute('data-bar-active')).toBeNull();
        });
    });
});
