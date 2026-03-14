import { describe, it, expect } from 'vitest';
import {
    normalizeQuoteText,
    enforceMaxLength,
    selectionFingerprint,
    sanitizeQuote,
    MAX_QUOTE_LENGTH,
} from '../services/quoteSanitizer';

describe('normalizeQuoteText', () => {
    it('collapses whitespace runs to single space', () => {
        expect(normalizeQuoteText('hello   world')).toBe('hello world');
    });

    it('collapses newlines and tabs', () => {
        expect(normalizeQuoteText('hello\n\n\tworld')).toBe('hello world');
    });

    it('trims leading/trailing whitespace', () => {
        expect(normalizeQuoteText('  hello  ')).toBe('hello');
    });

    it('handles empty string', () => {
        expect(normalizeQuoteText('')).toBe('');
    });
});

describe('enforceMaxLength', () => {
    it('returns short text unchanged', () => {
        expect(enforceMaxLength('hello', 100)).toBe('hello');
    });

    it('truncates at word boundary when possible', () => {
        const text = 'word '.repeat(50);
        const result = enforceMaxLength(text, 20);
        expect(result.length).toBeLessThanOrEqual(21);
        expect(result.endsWith('…')).toBe(true);
    });

    it('truncates at max length when no good word boundary', () => {
        const text = 'a'.repeat(3000);
        const result = enforceMaxLength(text, MAX_QUOTE_LENGTH);
        expect(result.length).toBeLessThanOrEqual(MAX_QUOTE_LENGTH + 1);
    });
});

describe('selectionFingerprint', () => {
    it('produces same hash for same inputs', () => {
        const fp1 = selectionFingerprint('src-1', 3, 'hello world');
        const fp2 = selectionFingerprint('src-1', 3, 'hello world');
        expect(fp1).toBe(fp2);
    });

    it('produces different hash for different text', () => {
        const fp1 = selectionFingerprint('src-1', 3, 'hello world');
        const fp2 = selectionFingerprint('src-1', 3, 'different text');
        expect(fp1).not.toBe(fp2);
    });

    it('produces different hash for different pages', () => {
        const fp1 = selectionFingerprint('src-1', 1, 'hello');
        const fp2 = selectionFingerprint('src-1', 2, 'hello');
        expect(fp1).not.toBe(fp2);
    });

    it('is case-insensitive', () => {
        const fp1 = selectionFingerprint('src-1', 1, 'Hello World');
        const fp2 = selectionFingerprint('src-1', 1, 'hello world');
        expect(fp1).toBe(fp2);
    });

    it('normalizes whitespace before hashing', () => {
        const fp1 = selectionFingerprint('src-1', 1, 'hello   world');
        const fp2 = selectionFingerprint('src-1', 1, 'hello world');
        expect(fp1).toBe(fp2);
    });
});

describe('sanitizeQuote', () => {
    it('strips HTML tags', () => {
        expect(sanitizeQuote('<b>bold</b> text')).toBe('bold text');
    });

    it('normalizes whitespace', () => {
        expect(sanitizeQuote('  hello  \n  world  ')).toBe('hello world');
    });

    it('handles empty string', () => {
        expect(sanitizeQuote('')).toBe('');
    });

    it('enforces max length', () => {
        const longText = 'word '.repeat(500);
        expect(sanitizeQuote(longText).length).toBeLessThanOrEqual(MAX_QUOTE_LENGTH + 1);
    });
});
