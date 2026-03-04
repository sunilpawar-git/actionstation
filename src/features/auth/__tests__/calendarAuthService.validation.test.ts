import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getCalendarToken,
    STORAGE_KEY,
    EXPIRY_KEY,
    DANGEROUS_TOKEN_CHARS,
} from '../services/calendarAuthService';

vi.mock('@/config/firebase', () => ({
    auth: { currentUser: { uid: 'u1' } },
}));

vi.mock('../stores/authStore', () => ({
    useAuthStore: Object.assign(
        vi.fn((selector?: (s: unknown) => unknown) => {
            const state = { setCalendarConnected: vi.fn() };
            return typeof selector === 'function' ? selector(state) : state;
        }),
        { getState: () => ({ setCalendarConnected: vi.fn() }) },
    ),
}));

describe('DANGEROUS_TOKEN_CHARS blocklist', () => {
    it('rejects tokens with script tags', () => {
        expect(DANGEROUS_TOKEN_CHARS.test('<script>alert(1)</script>')).toBe(true);
    });

    it('rejects tokens with semicolons and pipes', () => {
        expect(DANGEROUS_TOKEN_CHARS.test('token;drop')).toBe(true);
        expect(DANGEROUS_TOKEN_CHARS.test('token|cmd')).toBe(true);
    });

    it('rejects tokens with quotes', () => {
        expect(DANGEROUS_TOKEN_CHARS.test("token'inject")).toBe(true);
        expect(DANGEROUS_TOKEN_CHARS.test('token"inject')).toBe(true);
        expect(DANGEROUS_TOKEN_CHARS.test('token`inject')).toBe(true);
    });

    it('accepts valid alphanumeric tokens', () => {
        expect(DANGEROUS_TOKEN_CHARS.test('ya29.abc123_def-456.ghi')).toBe(false);
    });

    it('accepts base64 tokens with /, +, =', () => {
        expect(DANGEROUS_TOKEN_CHARS.test('ya29.abc/def+ghi=jkl==')).toBe(false);
    });

    it('rejects tokens with null bytes', () => {
        expect(DANGEROUS_TOKEN_CHARS.test('token\0truncated')).toBe(true);
    });
});

describe('getCalendarToken validation', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns null and clears storage when token has dangerous chars', () => {
        const futureExpiry = (Date.now() + 60_000).toString();
        localStorage.setItem(STORAGE_KEY, '<script>evil</script>');
        localStorage.setItem(EXPIRY_KEY, futureExpiry);

        const result = getCalendarToken();

        expect(result).toBeNull();
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem(EXPIRY_KEY)).toBeNull();
    });

    it('returns valid token when it has no dangerous chars', () => {
        const futureExpiry = (Date.now() + 60_000).toString();
        localStorage.setItem(STORAGE_KEY, 'ya29.valid-token_123');
        localStorage.setItem(EXPIRY_KEY, futureExpiry);

        const result = getCalendarToken();

        expect(result).toBe('ya29.valid-token_123');
    });

    it('returns base64 tokens with /, +, = chars', () => {
        const futureExpiry = (Date.now() + 60_000).toString();
        localStorage.setItem(STORAGE_KEY, 'ya29.token/with+base64=chars==');
        localStorage.setItem(EXPIRY_KEY, futureExpiry);

        const result = getCalendarToken();

        expect(result).toBe('ya29.token/with+base64=chars==');
    });

    it('returns null and clears storage when expiry is corrupted (NaN)', () => {
        localStorage.setItem(STORAGE_KEY, 'ya29.valid-token');
        localStorage.setItem(EXPIRY_KEY, 'not-a-number');

        const result = getCalendarToken();

        expect(result).toBeNull();
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem(EXPIRY_KEY)).toBeNull();
    });
});
