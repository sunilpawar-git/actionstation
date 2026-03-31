/**
 * useCheckout Hook Tests
 * Validates checkout initiation, error handling, and loading state.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckout } from '../useCheckout';

const { mockGetAuthToken } = vi.hoisted(() => ({
    mockGetAuthToken: vi.fn<() => Promise<string | null>>(),
}));

// Mock authStore with user id
let mockUserId: string | undefined = 'user-1';
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ user: mockUserId ? { id: mockUserId } : null }),
}));

vi.mock('@/features/auth/services/authTokenService', () => ({
    getAuthToken: mockGetAuthToken,
}));

vi.mock('@/features/subscription/utils/appCheckToken', () => ({
    getAppCheckToken: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/shared/services/logger', () => ({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const originalLocation = window.location;

describe('useCheckout', () => {
    beforeEach(() => {
        mockUserId = 'user-1';
        mockGetAuthToken.mockReset().mockResolvedValue('tok_valid');
        vi.stubGlobal('fetch', vi.fn());
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { href: '' },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        Object.defineProperty(window, 'location', {
            writable: true,
            value: originalLocation,
        });
    });

    it('initial state: not loading, no error', () => {
        const { result } = renderHook(() => useCheckout());
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('does nothing when user is not authenticated', async () => {
        mockUserId = undefined;
        const { result } = renderHook(() => useCheckout());
        await act(async () => {
            await result.current.startCheckout('price_test');
        });
        expect(fetch).not.toHaveBeenCalled();
        expect(result.current.error).toBeNull();
    });

    it('sets error when auth token is missing', async () => {
        mockGetAuthToken.mockResolvedValue(null);
        const { result } = renderHook(() => useCheckout());
        await act(async () => {
            await result.current.startCheckout('price_test');
        });
        expect(result.current.error).toBe('Authentication required');
    });

    it('redirects to checkoutUrl on success', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ checkoutUrl: 'https://checkout.stripe.com/test' }),
        }));
        const { result } = renderHook(() => useCheckout());
        await act(async () => {
            await result.current.startCheckout('price_pro_monthly_inr');
        });
        expect(window.location.href).toBe('https://checkout.stripe.com/test');
        expect(result.current.error).toBeNull();
    });

    it('sets error on non-ok HTTP response', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'Invalid price ID' }),
        }));
        const { result } = renderHook(() => useCheckout());
        await act(async () => {
            await result.current.startCheckout('price_bad');
        });
        expect(result.current.error).toBe('Invalid price ID');
    });

    it('sets error on network failure', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
        const { result } = renderHook(() => useCheckout());
        await act(async () => {
            await result.current.startCheckout('price_test');
        });
        expect(result.current.error).toBe('Network error');
    });

    it('sets isLoading=true during fetch and false after', async () => {
        interface FetchResponse { ok: boolean; status: number; json: () => Promise<unknown> }
        let resolvePromise!: (v: FetchResponse) => void;
        const pendingPromise = new Promise<FetchResponse>((res) => { resolvePromise = res; });
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingPromise));

        const { result } = renderHook(() => useCheckout());

        act(() => {
            void result.current.startCheckout('price_test');
        });
        // Loading should be true while awaiting
        expect(result.current.isLoading).toBe(true);

        // Resolve the pending fetch inside act to prevent state updates leaking outside act
        await act(async () => {
            resolvePromise({ ok: false, status: 503, json: () => Promise.resolve({ error: 'gone' }) });
        });
        expect(result.current.isLoading).toBe(false);
    });

    it('sends Authorization header with Bearer token', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'check header' }),
        });
        vi.stubGlobal('fetch', mockFetch);

        const { result } = renderHook(() => useCheckout());
        await act(async () => {
            await result.current.startCheckout('price_test');
        });

        const callInit = mockFetch.mock.calls[0]?.[1] as RequestInit;
        expect((callInit.headers as Record<string, string>).Authorization).toBe('Bearer tok_valid');
    });

    it('sends priceId in request body', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'check body' }),
        });
        vi.stubGlobal('fetch', mockFetch);

        const { result } = renderHook(() => useCheckout());
        await act(async () => {
            await result.current.startCheckout('price_pro_annual_usd');
        });

        const callInit = mockFetch.mock.calls[0]?.[1] as RequestInit;
        const body = JSON.parse(callInit.body as string) as Record<string, unknown>;
        expect(body.priceId).toBe('price_pro_annual_usd');
    });
});
