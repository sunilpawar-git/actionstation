import { describe, it, expect } from 'vitest';
import { toSafeArticleUrl } from '../utils/safeUrl';

describe('toSafeArticleUrl', () => {
    it('accepts any https URL', () => {
        const url = 'https://example.com/article';
        expect(toSafeArticleUrl(url)).toBe(url);
    });

    it('accepts https with path and query', () => {
        const url = 'https://blog.example.com/posts/123?ref=reader';
        expect(toSafeArticleUrl(url)).toBe(url);
    });

    it('rejects http URL', () => {
        expect(toSafeArticleUrl('http://example.com/article')).toBeNull();
    });

    it('rejects empty string', () => {
        expect(toSafeArticleUrl('')).toBeNull();
    });

    it('rejects malformed URL', () => {
        expect(toSafeArticleUrl('not-a-url')).toBeNull();
    });

    it('rejects data: URL', () => {
        expect(toSafeArticleUrl('data:text/html,<h1>hi</h1>')).toBeNull();
    });
});
