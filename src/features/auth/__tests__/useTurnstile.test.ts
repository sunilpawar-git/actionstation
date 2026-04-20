/**
 * useTurnstile Hook Tests
 *
 * Validates the Cloudflare Turnstile integration hook:
 *   - No-op mode when VITE_TURNSTILE_SITE_KEY is not configured
 *   - Full challenge flow: render → execute → poll token → verify via Cloud Function
 *   - Correct loading state transitions (isLoading true → false)
 *   - Error state on 403 response, network failure
 *
 * Mocking strategy:
 *   - window.turnstile: stubbed with vi.stubGlobal (allows loadTurnstileScript bypass)
 *   - fetch: stubbed with vi.stubGlobal
 *   - VITE_TURNSTILE_SITE_KEY: injected via vi.resetModules() + vi.stubEnv + dynamic import
 *     (required because the env var is captured at module initialization time)
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Shared mock setup ────────────────────────────────────────────────────

const MOCK_WIDGET_ID = 'test-widget-id';
const MOCK_TOKEN = 'cf-test-token-abc123';
const MOCK_SITE_KEY = 'test-site-key-0x4AAAAAAA';

function makeMockTurnstile(overrides: Partial<{
    getResponse: () => string | undefined;
}> = {}) {
    return {
        render: vi.fn().mockReturnValue(MOCK_WIDGET_ID),
        execute: vi.fn(),
        reset: vi.fn(),
        getResponse: vi.fn().mockReturnValue(MOCK_TOKEN),
        ready: vi.fn(),
        ...overrides,
    };
}

// ─── No site key configured (default in test environment) ─────────────────

describe('useTurnstile — no site key configured', () => {
    beforeEach(async () => {
        vi.resetModules();
        // VITE_TURNSTILE_SITE_KEY is NOT stubbed → undefined in the module
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('execute() returns true immediately (no-op, no challenge needed)', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        let value: boolean = false;
        await act(async () => {
            value = await result.current.execute();
        });

        expect(value).toBe(true);
    });

    it('isLoading stays false throughout (no async work done)', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        expect(result.current.isLoading).toBe(false);

        await act(async () => {
            await result.current.execute();
        });

        expect(result.current.isLoading).toBe(false);
    });

    it('error stays null (no failure possible in no-op mode)', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        await act(async () => {
            await result.current.execute();
        });

        expect(result.current.error).toBeNull();
    });
});

// ─── With site key configured ────────────────────────────────────────────

describe('useTurnstile — site key configured, successful challenge', () => {
    let mockTurnstile: ReturnType<typeof makeMockTurnstile>;
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.resetModules();
        vi.stubEnv('VITE_TURNSTILE_SITE_KEY', MOCK_SITE_KEY);

        mockTurnstile = makeMockTurnstile();
        vi.stubGlobal('turnstile', mockTurnstile);

        mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({}),
        });
        vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('execute() returns true on 200 response from verifyTurnstile', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        let value: boolean = false;
        await act(async () => {
            value = await result.current.execute();
        });

        expect(value).toBe(true);
    });

    it('execute() calls turnstile.render with the site key', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        await act(async () => {
            await result.current.execute();
        });

        expect(mockTurnstile.render).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ sitekey: MOCK_SITE_KEY }),
        );
    });

    it('execute() calls turnstile.execute on the rendered widget', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        await act(async () => {
            await result.current.execute();
        });

        expect(mockTurnstile.execute).toHaveBeenCalledWith(MOCK_WIDGET_ID);
    });

    it('execute() POSTs the token to the verifyTurnstile endpoint', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        await act(async () => {
            await result.current.execute();
        });

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/verifyTurnstile'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ token: MOCK_TOKEN }),
            }),
        );
    });

    it('isLoading is false after successful execution', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        await act(async () => {
            await result.current.execute();
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
    });

    it('error is null after successful execution', async () => {
        const { useTurnstile } = await import('../hooks/useTurnstile');
        const { result } = renderHook(() => useTurnstile());

        await act(async () => {
            await result.current.execute();
        });

        expect(result.current.error).toBeNull();
    });
});

// Failure scenarios (403 + network error) are in useTurnstile.failure.test.ts
