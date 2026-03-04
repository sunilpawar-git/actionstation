import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProximityBar } from '../useProximityBar';

vi.mock('../proximityHelpers', () => ({
    recalculatePlacement: vi.fn(),
    checkProximity: vi.fn(),
    PROXIMITY_THRESHOLD_PX: 80,
    FLIP_THRESHOLD_PX: 200,
}));

describe('useProximityBar cleanup', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not call onProximityLost after unmount when leave timeout is pending', () => {
        const card = document.createElement('div');
        const bar = document.createElement('div');
        const onProximityLost = vi.fn();

        const cardRef = { current: card };
        const barRef = { current: bar };

        const { unmount } = renderHook(() =>
            useProximityBar(cardRef, barRef, onProximityLost),
        );

        card.dispatchEvent(new MouseEvent('mouseleave'));

        unmount();

        vi.advanceTimersByTime(500);

        expect(onProximityLost).not.toHaveBeenCalled();
    });
});
