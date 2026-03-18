/**
 * Calendar Auth Service — handleCalendarCallback validation tests
 * Covers CSRF protection, code sanitisation, and error propagation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/firebase', () => ({
    auth: { currentUser: { uid: 'u1' } },
}));

vi.mock('firebase/functions', () => ({
    getFunctions: vi.fn(() => ({})),
    httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: { connected: true } })),
}));

vi.mock('../stores/authStore', () => ({
    useAuthStore: Object.assign(
        vi.fn((selector?: (s: unknown) => unknown) => {
            const state = { setCalendarConnected: vi.fn(), isCalendarConnected: false };
            return typeof selector === 'function' ? selector(state) : state;
        }),
        { getState: () => ({ setCalendarConnected: vi.fn() }) },
    ),
}));

vi.mock('@/shared/services/logger', () => ({
    logger: { warn: vi.fn(), error: vi.fn() },
}));

// eslint-disable-next-line import-x/first
import { handleCalendarCallback, CONNECTED_KEY } from '../services/calendarAuthService';

describe('handleCalendarCallback — CSRF protection', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    it('returns false when state is missing from sessionStorage', async () => {
        const result = await handleCalendarCallback('code123', 'any-state');
        expect(result).toBe(false);
        expect(localStorage.getItem(CONNECTED_KEY)).toBeNull();
    });

    it('returns false on state mismatch', async () => {
        sessionStorage.setItem('oauth_state', 'expected');
        const result = await handleCalendarCallback('code123', 'different');
        expect(result).toBe(false);
    });

    it('clears sessionStorage state even on mismatch (prevents reuse)', async () => {
        sessionStorage.setItem('oauth_state', 'expected');
        await handleCalendarCallback('code123', 'different');
        expect(sessionStorage.getItem('oauth_state')).toBeNull();
    });

    it('succeeds when code and state match', async () => {
        sessionStorage.setItem('oauth_state', 'correct-state');
        const result = await handleCalendarCallback('valid-code', 'correct-state');
        expect(result).toBe(true);
        expect(localStorage.getItem(CONNECTED_KEY)).toBe('true');
    });

    it('returns false when Cloud Function rejects the code', async () => {
        const { httpsCallable } = await import('firebase/functions');
        vi.mocked(httpsCallable).mockReturnValueOnce(
            vi.fn().mockRejectedValue(new Error('Token exchange failed')) as never,
        );
        sessionStorage.setItem('oauth_state', 'my-state');
        const result = await handleCalendarCallback('bad-code', 'my-state');
        expect(result).toBe(false);
    });

    it('returns false when Cloud Function returns connected: false', async () => {
        const { httpsCallable } = await import('firebase/functions');
        vi.mocked(httpsCallable).mockReturnValueOnce(
            vi.fn().mockResolvedValue({ data: { connected: false } }) as never,
        );
        sessionStorage.setItem('oauth_state', 'my-state');
        const result = await handleCalendarCallback('code', 'my-state');
        expect(result).toBe(false);
        expect(localStorage.getItem(CONNECTED_KEY)).toBeNull();
    });
});


vi.mock('../stores/authStore', () => ({
    useAuthStore: Object.assign(
        vi.fn((selector?: (s: unknown) => unknown) => {
            const state = { setCalendarConnected: vi.fn() };
            return typeof selector === 'function' ? selector(state) : state;
        }),
        { getState: () => ({ setCalendarConnected: vi.fn() }) },
    ),
}));
