/**
 * useHeroAnimation — Unit tests
 * TDD: written before implementation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock matchMedia for prefers-reduced-motion
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
});

describe('useHeroAnimation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockMatchMedia.mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts in idle phase', async () => {
        const { useHeroAnimation } = await import(
            '@/features/landing/hooks/useHeroAnimation'
        );
        const { result } = renderHook(() => useHeroAnimation());
        expect(result.current.phase).toBe('idle');
    });

    it('advances to nodesVisible after initial delay', async () => {
        const { useHeroAnimation } = await import(
            '@/features/landing/hooks/useHeroAnimation'
        );
        const { result } = renderHook(() => useHeroAnimation());
        act(() => {
            vi.advanceTimersByTime(600);
        });
        expect(result.current.phase).toBe('nodesVisible');
    });

    it('advances through all phases in order', async () => {
        const { useHeroAnimation } = await import(
            '@/features/landing/hooks/useHeroAnimation'
        );
        const { result } = renderHook(() => useHeroAnimation());

        // idle -> nodesVisible
        act(() => { vi.advanceTimersByTime(600); });
        expect(result.current.phase).toBe('nodesVisible');

        // nodesVisible -> edgesDrawn
        act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current.phase).toBe('edgesDrawn');

        // edgesDrawn -> synthesized
        act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current.phase).toBe('synthesized');

        // synthesized -> idle (reset for loop)
        act(() => { vi.advanceTimersByTime(2500); });
        expect(result.current.phase).toBe('idle');
    });

    it('does not update state after unmount (cleanup test)', async () => {
        const { useHeroAnimation } = await import(
            '@/features/landing/hooks/useHeroAnimation'
        );
        const { unmount } = renderHook(() => useHeroAnimation());
        // Start the first timer (400ms in, before 500ms fires)
        act(() => { vi.advanceTimersByTime(400); });
        // Unmount before any phase fires
        unmount();
        // Advance past all scheduled timers — must not throw act() warning
        act(() => { vi.advanceTimersByTime(10000); });
    });

    it('skips animation when prefers-reduced-motion is set', async () => {
        mockMatchMedia.mockReturnValue({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        });
        const { useHeroAnimation } = await import(
            '@/features/landing/hooks/useHeroAnimation'
        );
        const { result } = renderHook(() => useHeroAnimation());
        // Should immediately show final state
        expect(result.current.reducedMotion).toBe(true);
    });
});
