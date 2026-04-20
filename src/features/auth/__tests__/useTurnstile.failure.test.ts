/**
 * useTurnstile Hook — Failure Scenario Tests
 *
 * Covers the 403 response and network error paths.
 * Success and no-key tests are in useTurnstile.test.ts.
 *
 * Mocking strategy:
 *   - window.turnstile: stubbed with vi.stubGlobal
 *   - fetch: stubbed per-test to return failure responses
 *   - VITE_TURNSTILE_SITE_KEY: injected via vi.resetModules() + vi.stubEnv + dynamic import
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Shared mock setup ────────────────────────────────────────────────────

const MOCK_WIDGET_ID = 'test-widget-id';
const MOCK_TOKEN = 'cf-test-token-abc123';
const MOCK_SITE_KEY = 'test-site-key-0x4AAAAAAA';

function makeMockTurnstile() {
    return {
        render: vi.fn().mockReturnValue(MOCK_WIDGET_ID),
        execute: vi.fn(),
        reset: vi.fn(),
        getResponse: vi.fn().mockReturnValue(MOCK_TOKEN),
        ready: vi.fn(),
    };
}

// ─── 403 failure ──────────────────────────────────────────────────────────

describe('useTurnstile — verifyTurnstile returns 403', () => {
    let mockTurnstile: ReturnType<typeof makeMockTurnstile>;

    beforeEach(async () => {
        vi.resetModules();
        vi.stubEnv('VITE_TURNSTILE_SITE_KEY', MOCK_SITE_KEY);

        mockTurnstile = makeMockTurnstile();
        vi.stubGlobal('turnstile', mockTurnstile);

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 403,
            json: vi.fn().mockResolvedValue({ error: 'Invalid token' }),
        }));
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('execute() returns false on 403 response', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        let value: boolean = true;
        await act(async () => {
            value = await result.current.execute();
        });

        expect(value).toBe(false);
    });

    it('error is set to a non-null string on 403', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        await act(async () => {
            await result.current.execute();
        });

        await waitFor(() => {
            expect(result.current.error).not.toBeNull();
            expect(typeof result.current.error).toBe('string');
        });
    });

    it('isLoading is false after rejection', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        await act(async () => {
            await result.current.execute();
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
    });

    it('widget is reset after failed verification', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        await act(async () => {
            await result.current.execute();
        });

        expect(mockTurnstile.reset).toHaveBeenCalledWith(MOCK_WIDGET_ID);
    });
});

// ─── Network error ───────────────────────────────────────────────────────

describe('useTurnstile — network error during verification', () => {
    beforeEach(async () => {
        vi.resetModules();
        vi.stubEnv('VITE_TURNSTILE_SITE_KEY', MOCK_SITE_KEY);

        vi.stubGlobal('turnstile', makeMockTurnstile());
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('execute() returns false on network error', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        let value: boolean = true;
        await act(async () => {
            value = await result.current.execute();
        });

        expect(value).toBe(false);
    });

    it('error is set to a non-null string on network failure', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        await act(async () => {
            await result.current.execute();
        });

        await waitFor(() => {
            expect(result.current.error).not.toBeNull();
        });
    });

    it('isLoading is false after network failure', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        await act(async () => {
            await result.current.execute();
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
    });
});
