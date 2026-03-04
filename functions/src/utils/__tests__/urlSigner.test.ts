/**
 * URL Signer Tests
 * Validates HMAC signing/verification, expiration, and tamper detection
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSignedParams, verifySignedParams } from '../urlSigner.js';

const TEST_SIGNING_KEY = 'unit-test-hmac-key-not-a-real-secret';
const IMAGE_URL = 'https://example.com/image.png';

describe('urlSigner', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    describe('createSignedParams', () => {
        it('returns sig and exp query params', () => {
            const params = createSignedParams(IMAGE_URL, TEST_SIGNING_KEY);
            expect(params).toMatch(/^sig=[a-f0-9]{64}&exp=\d+$/);
        });

        it('produces different signatures for different URLs', () => {
            const params1 = createSignedParams(IMAGE_URL, TEST_SIGNING_KEY);
            const params2 = createSignedParams('https://other.com/img.jpg', TEST_SIGNING_KEY);
            const sig1 = params1.split('&')[0];
            const sig2 = params2.split('&')[0];
            expect(sig1).not.toBe(sig2);
        });

        it('produces different signatures for different secrets', () => {
            const params1 = createSignedParams(IMAGE_URL, 'hmac-key-alpha-placeholder');
            const params2 = createSignedParams(IMAGE_URL, 'hmac-key-beta-placeholder');
            const sig1 = params1.split('&')[0];
            const sig2 = params2.split('&')[0];
            expect(sig1).not.toBe(sig2);
        });
    });

    describe('verifySignedParams', () => {
        it('returns true for a valid, non-expired signature', () => {
            const params = createSignedParams(IMAGE_URL, TEST_SIGNING_KEY);
            const { sig, exp } = parseParams(params);
            expect(verifySignedParams(IMAGE_URL, sig, exp, TEST_SIGNING_KEY)).toBe(true);
        });

        it('returns false for an expired signature', () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

            const params = createSignedParams(IMAGE_URL, TEST_SIGNING_KEY);
            const { sig, exp } = parseParams(params);

            vi.setSystemTime(new Date('2025-01-01T00:11:00Z'));
            expect(verifySignedParams(IMAGE_URL, sig, exp, TEST_SIGNING_KEY)).toBe(false);
        });

        it('returns false for a tampered signature', () => {
            const params = createSignedParams(IMAGE_URL, TEST_SIGNING_KEY);
            const { exp } = parseParams(params);
            const tamperedSig = 'a'.repeat(64);
            expect(verifySignedParams(IMAGE_URL, tamperedSig, exp, TEST_SIGNING_KEY)).toBe(false);
        });

        it('returns false for a different image URL', () => {
            const params = createSignedParams(IMAGE_URL, TEST_SIGNING_KEY);
            const { sig, exp } = parseParams(params);
            expect(verifySignedParams('https://evil.com/bad.png', sig, exp, TEST_SIGNING_KEY)).toBe(false);
        });

        it('returns false for a wrong secret', () => {
            const params = createSignedParams(IMAGE_URL, TEST_SIGNING_KEY);
            const { sig, exp } = parseParams(params);
            expect(verifySignedParams(IMAGE_URL, sig, exp, 'wrong-secret')).toBe(false);
        });

        it('returns false for non-numeric exp', () => {
            const params = createSignedParams(IMAGE_URL, TEST_SIGNING_KEY);
            const { sig } = parseParams(params);
            expect(verifySignedParams(IMAGE_URL, sig, 'not-a-number', TEST_SIGNING_KEY)).toBe(false);
        });

        it('returns false for wrong-length sig without throwing', () => {
            const params = createSignedParams(IMAGE_URL, TEST_SIGNING_KEY);
            const { exp } = parseParams(params);
            expect(verifySignedParams(IMAGE_URL, 'x', exp, TEST_SIGNING_KEY)).toBe(false);
        });
    });
});

function parseParams(params: string): { sig: string; exp: string } {
    const parts = new URLSearchParams(params);
    return { sig: parts.get('sig')!, exp: parts.get('exp')! };
}
