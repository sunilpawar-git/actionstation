/**
 * NodeUtilsBar Interaction Tests — Flat bar stability, proximity, data-bar-active.
 * Split from NodeUtilsBar.test.tsx to meet 300-line file limit.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';
import { NodeUtilsBar } from '../NodeUtilsBar';

describe('NodeUtilsBar interaction', () => {
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
                <NodeUtilsBar
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
                <NodeUtilsBar
                    {...defaultProps}
                    registerProximityLostFn={(fn) => { proximityLostFn = fn; }}
                />
            );

            expect(proximityLostFn).not.toBeNull();
        });

        it('proximityLost closes open transform submenu', () => {
            let proximityLostFn: (() => void) | null = null;
            render(
                <NodeUtilsBar
                    {...defaultProps}
                    hasContent={true}
                    onTransform={vi.fn()}
                    registerProximityLostFn={(fn) => { proximityLostFn = fn; }}
                />
            );

            fireEvent.click(screen.getByLabelText(strings.ideaCard.transform));

            act(() => { proximityLostFn?.(); });

            const container = screen.getByRole('toolbar').parentElement;
            expect(container?.getAttribute('data-bar-active')).toBeNull();
        });
    });

    describe('CSS data-bar-active attribute', () => {
        it('sets data-bar-active when transform submenu is opened', () => {
            render(
                <NodeUtilsBar {...defaultProps} hasContent onTransform={vi.fn()} />
            );
            const container = screen.getByRole('toolbar').parentElement;
            expect(container).not.toBeNull();

            expect(container!.getAttribute('data-bar-active')).toBeNull();

            fireEvent.click(screen.getByLabelText(strings.ideaCard.transform));

            expect(container!.getAttribute('data-bar-active')).toBe('true');
        });

        it('removes data-bar-active when submenu is closed via outside click', () => {
            render(
                <NodeUtilsBar {...defaultProps} hasContent onTransform={vi.fn()} />
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
