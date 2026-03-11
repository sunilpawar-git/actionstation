/**
 * CanvasTooltip — Unit tests for discoverability tooltip.
 * Validates: initial visibility, localStorage dismissal, auto-dismiss timer.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CanvasTooltip, TOOLTIP_STORAGE_KEY } from '../CanvasTooltip';
import { strings } from '@/shared/localization/strings';

describe('CanvasTooltip', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows tooltip on first visit', () => {
        render(<CanvasTooltip />);
        expect(screen.getByText(strings.canvas.doubleClickToCreate.tooltip)).toBeInTheDocument();
    });

    it('does NOT show tooltip if already dismissed', () => {
        localStorage.setItem(TOOLTIP_STORAGE_KEY, 'true');
        render(<CanvasTooltip />);
        expect(screen.queryByText(strings.canvas.doubleClickToCreate.tooltip)).not.toBeInTheDocument();
    });

    it('auto-dismisses after 4 seconds', () => {
        render(<CanvasTooltip />);
        expect(screen.getByText(strings.canvas.doubleClickToCreate.tooltip)).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(4000);
        });

        expect(screen.queryByText(strings.canvas.doubleClickToCreate.tooltip)).not.toBeInTheDocument();
        expect(localStorage.getItem(TOOLTIP_STORAGE_KEY)).toBe('true');
    });

    it('uses string resource from canvasStrings', () => {
        render(<CanvasTooltip />);
        const text = strings.canvas.doubleClickToCreate.tooltip;
        expect(text).toBe('Double-click to add a note');
        expect(screen.getByText(text)).toBeInTheDocument();
    });

    it('has accessible role="status"', () => {
        render(<CanvasTooltip />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });
});
