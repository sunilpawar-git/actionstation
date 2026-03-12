/**
 * uuid — Unit tests for generateUUID
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateUUID } from '../uuid';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateUUID', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns a valid UUID v4 string', () => {
        expect(generateUUID()).toMatch(UUID_V4_RE);
    });

    it('returns unique values on successive calls', () => {
        const ids = new Set(Array.from({ length: 50 }, () => generateUUID()));
        expect(ids.size).toBe(50);
    });

    it('falls back when crypto.randomUUID is unavailable', () => {
        const original = crypto.randomUUID;
        // Temporarily remove randomUUID to trigger fallback
        Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
        try {
            const id = generateUUID();
            expect(id).toMatch(UUID_V4_RE);
        } finally {
            Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
        }
    });
});
