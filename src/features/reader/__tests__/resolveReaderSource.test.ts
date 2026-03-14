import { describe, it, expect } from 'vitest';
import { resolveReaderSource } from '../services/resolveReaderSource';

describe('resolveReaderSource', () => {
    it('returns pdf source for application/pdf mime', () => {
        const result = resolveReaderSource({
            url: 'https://firebasestorage.googleapis.com/file.pdf',
            filename: 'doc.pdf',
            mimeType: 'application/pdf',
        });
        expect(result).not.toBeNull();
        expect(result?.type).toBe('pdf');
        expect(result?.mime).toBe('application/pdf');
    });

    it('returns image source for image/* mime', () => {
        const result = resolveReaderSource({
            url: 'https://firebasestorage.googleapis.com/img.png',
            filename: 'photo.png',
            mimeType: 'image/png',
        });
        expect(result).not.toBeNull();
        expect(result?.type).toBe('image');
    });

    it('returns null for unsupported mime', () => {
        expect(resolveReaderSource({
            url: 'https://firebasestorage.googleapis.com/doc.csv',
            filename: 'data.csv',
            mimeType: 'text/csv',
        })).toBeNull();
    });

    it('returns null for invalid URL', () => {
        expect(resolveReaderSource({
            url: 'https://evil.com/file.pdf',
            filename: 'doc.pdf',
            mimeType: 'application/pdf',
        })).toBeNull();
    });

    it('returns null for empty URL', () => {
        expect(resolveReaderSource({
            url: '',
            filename: 'doc.pdf',
            mimeType: 'application/pdf',
        })).toBeNull();
    });

    it('generates stable hash-based sourceId from URL', () => {
        const url = 'https://firebasestorage.googleapis.com/abc123456789';
        const a = resolveReaderSource({ url, filename: 'test.pdf', mimeType: 'application/pdf' });
        const b = resolveReaderSource({ url, filename: 'test.pdf', mimeType: 'application/pdf' });
        expect(a?.sourceId).toMatch(/^att-[a-z0-9]+$/);
        expect(a?.sourceId).toBe(b?.sourceId);
    });
});
