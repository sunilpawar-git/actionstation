/**
 * metaParser unit tests
 * TDD: Validates OG/Twitter metadata extraction including edge cases
 */
import { describe, it, expect } from 'vitest';
import { parseMetaTags, extractDomain } from '../utils/metaParser';

describe('extractDomain', () => {
    it('extracts hostname from valid URL', () => {
        expect(extractDomain('https://example.com/path')).toBe('example.com');
    });

    it('returns empty string for invalid URL', () => {
        expect(extractDomain('not-a-url')).toBe('');
    });
});

describe('parseMetaTags — standard og:image', () => {
    it('extracts og:image URL', () => {
        const html = `<html><head>
            <meta property="og:image" content="https://example.com/image.jpg" />
        </head></html>`;
        const result = parseMetaTags(html, 'https://example.com/page');
        expect(result.image).toBe('https://example.com/image.jpg');
    });

    it('falls back to twitter:image when og:image is absent', () => {
        const html = `<html><head>
            <meta name="twitter:image" content="https://example.com/tw-img.jpg" />
        </head></html>`;
        const result = parseMetaTags(html, 'https://example.com/page');
        expect(result.image).toBe('https://example.com/tw-img.jpg');
    });
});

describe('parseMetaTags — og:image:secure_url fallback (Bug 2)', () => {
    it('uses og:image:secure_url when og:image is absent', () => {
        const html = `<html><head>
            <meta property="og:image:secure_url" content="https://example.com/secure.jpg" />
        </head></html>`;
        const result = parseMetaTags(html, 'https://example.com/page');
        expect(result.image).toBe('https://example.com/secure.jpg');
    });

    it('prefers og:image over og:image:secure_url when both present', () => {
        const html = `<html><head>
            <meta property="og:image" content="https://example.com/image.jpg" />
            <meta property="og:image:secure_url" content="https://example.com/secure.jpg" />
        </head></html>`;
        const result = parseMetaTags(html, 'https://example.com/page');
        expect(result.image).toBe('https://example.com/image.jpg');
    });
});

describe('parseMetaTags — relative og:image resolution (Bug 1)', () => {
    it('resolves relative og:image URL against page URL', () => {
        const html = `<html><head>
            <meta property="og:image" content="/images/hero.jpg" />
        </head></html>`;
        const result = parseMetaTags(html, 'https://example.com/page');
        expect(result.image).toBe('https://example.com/images/hero.jpg');
    });

    it('resolves protocol-relative og:image URL', () => {
        const html = `<html><head>
            <meta property="og:image" content="//cdn.example.com/img.jpg" />
        </head></html>`;
        const result = parseMetaTags(html, 'https://example.com/page');
        expect(result.image).toBe('https://cdn.example.com/img.jpg');
    });

    it('does not alter already-absolute og:image URL', () => {
        const html = `<html><head>
            <meta property="og:image" content="https://cdn.example.com/img.jpg" />
        </head></html>`;
        const result = parseMetaTags(html, 'https://example.com/page');
        expect(result.image).toBe('https://cdn.example.com/img.jpg');
    });
});

describe('parseMetaTags — title and description', () => {
    it('extracts og:title', () => {
        const html = `<html><head>
            <meta property="og:title" content="My Article" />
        </head></html>`;
        expect(parseMetaTags(html, 'https://example.com').title).toBe('My Article');
    });

    it('falls back to <title> tag', () => {
        const html = `<html><head><title>Page Title</title></head></html>`;
        expect(parseMetaTags(html, 'https://example.com').title).toBe('Page Title');
    });
});

describe('parseMetaTags — favicon', () => {
    it('resolves relative favicon href', () => {
        const html = `<html><head>
            <link rel="icon" href="/favicon.ico" />
        </head></html>`;
        const result = parseMetaTags(html, 'https://example.com/page');
        expect(result.favicon).toBe('https://example.com/favicon.ico');
    });

    it('falls back to /favicon.ico when no link[rel=icon]', () => {
        const html = `<html><head></head></html>`;
        const result = parseMetaTags(html, 'https://example.com/page');
        expect(result.favicon).toBe('https://example.com/favicon.ico');
    });
});
