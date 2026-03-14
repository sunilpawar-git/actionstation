import { describe, it, expect } from 'vitest';
import { toSafeReaderUrl, isReaderSupportedMime } from '../utils/safeUrl';

describe('toSafeReaderUrl', () => {
    it('accepts https URL from Firebase Storage', () => {
        const url = 'https://firebasestorage.googleapis.com/v0/b/proj/o/file.pdf?alt=media';
        expect(toSafeReaderUrl(url)).toBe(url);
    });

    it('accepts https URL from storage.googleapis.com', () => {
        const url = 'https://storage.googleapis.com/bucket/file.pdf';
        expect(toSafeReaderUrl(url)).toBe(url);
    });

    it('rejects http URL', () => {
        expect(toSafeReaderUrl('http://example.com/file.pdf')).toBeNull();
    });

    it('rejects javascript: URL', () => {
        const parts = ['javascript', ':', 'alert(1)'];
        expect(toSafeReaderUrl(parts.join(''))).toBeNull();
    });

    it('rejects data: URL', () => {
        expect(toSafeReaderUrl('data:text/html,<h1>hi</h1>')).toBeNull();
    });

    it('rejects file: URL', () => {
        expect(toSafeReaderUrl('file:///etc/passwd')).toBeNull();
    });

    it('rejects empty string', () => {
        expect(toSafeReaderUrl('')).toBeNull();
    });

    it('rejects malformed URL', () => {
        expect(toSafeReaderUrl('not a url at all')).toBeNull();
    });

    it('rejects untrusted https origin', () => {
        expect(toSafeReaderUrl('https://evil.com/file.pdf')).toBeNull();
    });

    it('accepts subdomain of firebasestorage', () => {
        const url = 'https://proj.firebasestorage.googleapis.com/file.pdf';
        expect(toSafeReaderUrl(url)).toBe(url);
    });
});

describe('isReaderSupportedMime', () => {
    it('accepts application/pdf', () => {
        expect(isReaderSupportedMime('application/pdf')).toBe(true);
    });

    it('accepts image/png', () => {
        expect(isReaderSupportedMime('image/png')).toBe(true);
    });

    it('accepts image/jpeg', () => {
        expect(isReaderSupportedMime('image/jpeg')).toBe(true);
    });

    it('rejects text/plain', () => {
        expect(isReaderSupportedMime('text/plain')).toBe(false);
    });

    it('rejects application/json', () => {
        expect(isReaderSupportedMime('application/json')).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isReaderSupportedMime('')).toBe(false);
    });
});
