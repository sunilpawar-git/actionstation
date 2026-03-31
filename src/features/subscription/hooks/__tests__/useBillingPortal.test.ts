/**
 * useBillingPortal Hook Tests
 * Validates portal redirect, error handling, and loading state.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBillingPortal } from '../useBillingPortal';

const { mockGetAuthToken } = vi.hoisted(() => ({
    mockGetAuthToken: vi.fn<() => Promise<string | null>>(),
}));

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

describe('useBillingPortal', () => {
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
        const { result } = renderHook(() => useBillingPortal());
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('does nothing when user is not authenticated', async () => {
        mockUserId = undefined;
        const { result } = renderHook(() => useBillingPortal());
        await act(async () => {
            await result.current.openBillingPortal();
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('sets error when auth token is missing', async () => {
        mockGetAuthToken.mockResolvedValue(null);
        const { result } = renderHook(() => useBillingPortal());
        await act(async () => {
            await result.current.openBillingPortal();
        });
        expect(result.current.error).toBe('Authentication required');
    });

    it('redirects to portalUrl on success', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ portalUrl: 'https://billing.stripe.com/portal' }),
        }));
        const { result } = renderHook(() => useBillingPortal());
        await act(async () => {
            await result.current.openBillingPortal();
        });
        expect(window.location.href).toBe('https://billing.stripe.com/portal');
        expect(result.current.error).toBeNull();
    });

    it('sets error on non-ok response', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: 'No subscription found' }),
        }));
        const { result } = renderHook(() => useBillingPortal());
        await act(async () => {
            await result.current.openBillingPortal();
        });
        expect(result.current.error).toBe('No subscription found');
    });

    it('sets error on network failure', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
        const { result } = renderHook(() => useBillingPortal());
        await act(async () => {
            await result.current.openBillingPortal();
        });
        expect(result.current.error).toBe('Network error');
    });

    it('sends Authorization header with Bearer token', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'check header' }),
        });
        vi.stubGlobal('fetch', mockFetch);

        const { result } = renderHook(() => useBillingPortal());
        await act(async () => {
            await result.current.openBillingPortal();
        });
        const init = mockFetch.mock.calls[0]?.[1] as RequestInit;
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok_valid');
    });

    it('sends POST to createBillingPortalSession endpoint', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'check endpoint' }),
        });
        vi.stubGlobal('fetch', mockFetch);

        const { result } = renderHook(() => useBillingPortal());
        await act(async () => {
            await result.current.openBillingPortal();
        });
        const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
        expect(calledUrl).toContain('createBillingPortalSession');
        expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
    });

    it('isLoading is false after successful call', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ portalUrl: 'https://billing.stripe.com/p' }),
        }));
        const { result } = renderHook(() => useBillingPortal());
        await act(async () => {
            await result.current.openBillingPortal();
        });
        expect(result.current.isLoading).toBe(false);
    });
});
