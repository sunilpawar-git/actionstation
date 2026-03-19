/**
 * Calendar Auth Service Tests
 * Tests the Authorization Code flow: checkCalendarConnection, connectGoogleCalendar,
 * handleCalendarCallback, and disconnectGoogleCalendar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/firebase', () => ({
    auth: { currentUser: { uid: 'test-uid' } },
}));

vi.mock('firebase/functions', () => ({
    getFunctions: vi.fn(() => ({})),
    httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: { connected: true } })),
}));

const mockSetCalendarConnected = vi.fn();
vi.mock('../stores/authStore', () => ({
    useAuthStore: {
        getState: () => ({ setCalendarConnected: mockSetCalendarConnected }),
    },
}));

vi.mock('@/shared/services/logger', () => ({
    logger: { warn: vi.fn(), error: vi.fn() },
}));

// eslint-disable-next-line import-x/first
import { auth } from '@/config/firebase';
// eslint-disable-next-line import-x/first
import {
    checkCalendarConnection,
    connectGoogleCalendar,
    handleCalendarCallback,
    disconnectGoogleCalendar,
    CONNECTED_KEY,
} from '../services/calendarAuthService';

describe('checkCalendarConnection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('sets isCalendarConnected true when CONNECTED_KEY is set', () => {
        localStorage.setItem(CONNECTED_KEY, 'true');
        checkCalendarConnection();
        expect(mockSetCalendarConnected).toHaveBeenCalledWith(true);
    });

    it('sets isCalendarConnected false when localStorage is empty', () => {
        checkCalendarConnection();
        expect(mockSetCalendarConnected).toHaveBeenCalledWith(false);
    });

    it('sets isCalendarConnected false when CONNECTED_KEY is not "true"', () => {
        localStorage.setItem(CONNECTED_KEY, 'false');
        checkCalendarConnection();
        expect(mockSetCalendarConnected).toHaveBeenCalledWith(false);
    });

    it('does nothing when no authenticated user', () => {
        const original = auth.currentUser;
        // @ts-expect-error Mocking readonly property
        auth.currentUser = null;
        checkCalendarConnection();
        expect(mockSetCalendarConnected).not.toHaveBeenCalled();
        // @ts-expect-error Mocking readonly property
        auth.currentUser = original;
    });
});

describe('connectGoogleCalendar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { href: '', origin: 'https://actionstation-244f0.web.app', pathname: '/' },
        });
        Object.defineProperty(import.meta, 'env', {
            value: { VITE_GOOGLE_CLIENT_ID: 'test-client-id' },
        });
    });

    it('returns false when no clientId is configured', async () => {
        Object.defineProperty(import.meta, 'env', { value: {} });
        const result = connectGoogleCalendar();
        expect(result).toBe(false);
    });

    it('returns false when no auth user', async () => {
        const original = auth.currentUser;
        // @ts-expect-error Mocking readonly property
        auth.currentUser = null;
        const result = connectGoogleCalendar();
        expect(result).toBe(false);
        // @ts-expect-error Mocking readonly property
        auth.currentUser = original;
    });
});

describe('handleCalendarCallback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
    });

    it('sets CONNECTED_KEY and returns true on success', async () => {
        sessionStorage.setItem('oauth_state', 'test-state-123');
        const result = await handleCalendarCallback('auth-code-abc', 'test-state-123');
        expect(result).toBe(true);
        expect(localStorage.getItem(CONNECTED_KEY)).toBe('true');
        expect(mockSetCalendarConnected).toHaveBeenCalledWith(true);
    });

    it('returns false and clears state on CSRF mismatch', async () => {
        sessionStorage.setItem('oauth_state', 'expected-state');
        const result = await handleCalendarCallback('auth-code-abc', 'wrong-state');
        expect(result).toBe(false);
        expect(localStorage.getItem(CONNECTED_KEY)).toBeNull();
    });

    it('returns false when no stored state (replay attack)', async () => {
        const result = await handleCalendarCallback('auth-code-abc', 'some-state');
        expect(result).toBe(false);
    });

    it('clears sessionStorage state after use', async () => {
        sessionStorage.setItem('oauth_state', 'state-xyz');
        await handleCalendarCallback('code', 'state-xyz');
        expect(sessionStorage.getItem('oauth_state')).toBeNull();
    });
});

describe('disconnectGoogleCalendar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('clears CONNECTED_KEY and updates store', () => {
        localStorage.setItem(CONNECTED_KEY, 'true');
        disconnectGoogleCalendar();
        expect(localStorage.getItem(CONNECTED_KEY)).toBeNull();
        expect(mockSetCalendarConnected).toHaveBeenCalledWith(false);
    });

    it('returns false when no auth user', () => {
        const original = auth.currentUser;
        // @ts-expect-error Mocking readonly property
        auth.currentUser = null;
        const result = disconnectGoogleCalendar();
        expect(result).toBe(false);
        // @ts-expect-error Mocking readonly property
        auth.currentUser = original;
    });
});
