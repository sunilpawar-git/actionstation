import { describe, it, expect } from 'vitest';
import { buildQuoteMarkdown } from '../services/quoteInsertionService';
import type { QuoteAttribution } from '../services/quoteInsertionService';

const testAttribution: QuoteAttribution = {
    sourceId: 'att-test',
    sourceType: 'pdf',
    filename: 'research.pdf',
    page: 5,
    nodeId: 'node-1',
};

describe('buildQuoteMarkdown', () => {
    it('produces blockquote markdown with attribution', () => {
        const result = buildQuoteMarkdown('Important finding here', testAttribution);
        expect(result).toContain('> Important finding here');
        expect(result).toContain('research.pdf');
        expect(result).toContain('p.5');
    });

    it('omits page when not provided', () => {
        const attrs = { ...testAttribution, page: undefined };
        const result = buildQuoteMarkdown('Some text', attrs);
        expect(result).not.toContain('p.');
        expect(result).toContain('research.pdf');
    });

    it('sanitizes HTML in quote text', () => {
        const result = buildQuoteMarkdown('<script>alert(1)</script>Hello', testAttribution);
        expect(result).not.toContain('<script>');
        expect(result).toContain('Hello');
    });

    it('returns empty string for empty text', () => {
        expect(buildQuoteMarkdown('', testAttribution)).toBe('');
    });

    it('returns empty string for whitespace-only text', () => {
        expect(buildQuoteMarkdown('   ', testAttribution)).toBe('');
    });

    it('escapes markdown metacharacters in filename', () => {
        const attrs = { ...testAttribution, filename: '[My *File*]_report.pdf' };
        const result = buildQuoteMarkdown('Quote text', attrs);
        expect(result).toContain('\\[My \\*File\\*\\]\\_report.pdf');
        expect(result).not.toContain('[My *File*]_report.pdf');
    });
});
