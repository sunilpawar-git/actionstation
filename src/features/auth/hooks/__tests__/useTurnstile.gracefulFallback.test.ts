/**
 * useTurnstile graceful fallback tests
 *
 * Verifies that when VITE_TURNSTILE_SITE_KEY is not configured,
 * the hook bypasses the CAPTCHA challenge and returns true (allows login).
 * This ensures the app is functional before Turnstile secrets are deployed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTurnstile } from '../useTurnstile';

// Must stub BEFORE the module is imported
vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');

const mockLoggerWarn = vi.fn();
vi.mock('@/shared/services/logger', () => ({
    logger: { warn: (...a: unknown[]) => mockLoggerWarn(...a), error: vi.fn(), info: vi.fn() },
}));

describe('useTurnstile — graceful fallback (no site key)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Ensure no turnstile global leaks into tests
        Object.defineProperty(window, 'turnstile', { value: undefined, writable: true, configurable: true });
    });

    it('returns true immediately when VITE_TURNSTILE_SITE_KEY is empty', async () => {
        const { result } = renderHook(() => useTurnstile());
        let returnValue = false;
        await act(async () => {
            returnValue = await result.current.execute();
        });
        expect(returnValue).toBe(true);
    });

    it('does not set isLoading when site key is missing', async () => {
        const { result } = renderHook(() => useTurnstile());
        await act(async () => { await result.current.execute(); });
        expect(result.current.isLoading).toBe(false);
    });

    it('logs a warning when site key is missing', async () => {
        const { result } = renderHook(() => useTurnstile());
        await act(async () => { await result.current.execute(); });
        expect(mockLoggerWarn).toHaveBeenCalledOnce();
        expect(mockLoggerWarn.mock.calls[0]?.[0]).toContain('VITE_TURNSTILE_SITE_KEY');
    });

    it('does not set error state when site key is missing', async () => {
        const { result } = renderHook(() => useTurnstile());
        await act(async () => { await result.current.execute(); });
        expect(result.current.error).toBeNull();
    });

    it('does not attempt to load Turnstile script when site key is missing', async () => {
        const appendChildSpy = vi.spyOn(document.head, 'appendChild');
        const { result } = renderHook(() => useTurnstile());
        await act(async () => { await result.current.execute(); });
        const scriptAdded = appendChildSpy.mock.calls.some(
            ([el]) => el instanceof HTMLScriptElement && (el as HTMLScriptElement).src.includes('challenges.cloudflare.com'),
        );
        expect(scriptAdded).toBe(false);
        appendChildSpy.mockRestore();
    });
});
