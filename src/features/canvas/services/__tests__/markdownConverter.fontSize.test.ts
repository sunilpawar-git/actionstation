/**
 * markdownConverter — font-size <span> round-trip tests
 */
import { describe, it, expect } from 'vitest';
import { htmlToMarkdown, markdownToHtml } from '../markdownConverter';

describe('htmlToMarkdown — font-size span preservation', () => {
    it('preserves a span with font-size inline style as raw HTML', () => {
        const md = htmlToMarkdown('<p><span style="font-size: 1.25rem">big text</span></p>');
        expect(md).toContain('<span style="font-size: 1.25rem">');
        expect(md).toContain('big text');
    });

    it('preserves text content of the font-size span', () => {
        const md = htmlToMarkdown('<p><span style="font-size: 0.75rem">tiny</span></p>');
        expect(md).toContain('tiny');
        expect(md).toContain('font-size: 0.75rem');
    });

    it('preserves all font size step values', () => {
        const sizes = ['0.75rem', '0.875rem', '1.125rem', '1.25rem', '1.5rem', '2rem'];
        for (const size of sizes) {
            const md = htmlToMarkdown(`<p><span style="font-size: ${size}">text</span></p>`);
            expect(md).toContain(`font-size: ${size}`);
        }
    });

    it('unwraps a span with no style attribute', () => {
        const md = htmlToMarkdown('<p><span>plain</span></p>');
        expect(md).toBe('plain');
        expect(md).not.toContain('<span');
    });

    it('unwraps a span whose style does not contain font-size', () => {
        const md = htmlToMarkdown('<p><span style="color: red">coloured</span></p>');
        expect(md).not.toContain('<span');
        expect(md).toContain('coloured');
    });

    it('preserves a font-size span inline within surrounding text', () => {
        const md = htmlToMarkdown('<p>before <span style="font-size: 1.5rem">big</span> after</p>');
        expect(md).toContain('<span style="font-size: 1.5rem">big</span>');
        expect(md).toContain('before');
        expect(md).toContain('after');
    });
});

describe('htmlToMarkdown / markdownToHtml — font-size span round-trip', () => {
    function roundTrip(html: string): string {
        return markdownToHtml(htmlToMarkdown(html));
    }

    it('span with font-size survives the round-trip', () => {
        const result = roundTrip('<p><span style="font-size: 1.25rem">big text</span></p>');
        expect(result).toContain('font-size: 1.25rem');
        expect(result).toContain('big text');
    });

    it('span with font-size survives inline within other text', () => {
        const result = roundTrip('<p>before <span style="font-size: 2rem">huge</span> after</p>');
        expect(result).toContain('font-size: 2rem');
        expect(result).toContain('huge');
    });

    it('font-size span and bold together survive round-trip', () => {
        const result = roundTrip('<p><strong>bold</strong> and <span style="font-size: 1.5rem">big</span></p>');
        expect(result).toContain('bold');
        expect(result).toContain('font-size: 1.5rem');
    });

    it('plain text without font-size is unaffected', () => {
        const result = roundTrip('<p>normal text</p>');
        expect(result).toContain('normal text');
        expect(result).not.toContain('<span');
    });
});

// ─── Regression: font-size-adjust must not be treated as font-size ────────────

describe('htmlToMarkdown — font-size-adjust must not match', () => {
    it('unwraps a span with font-size-adjust (not font-size) style', () => {
        const md = htmlToMarkdown('<p><span style="font-size-adjust: 0.5">adjusted</span></p>');
        expect(md).not.toContain('<span');
        expect(md).toContain('adjusted');
    });

    it('preserves a span that has BOTH font-size-adjust AND font-size', () => {
        const md = htmlToMarkdown('<p><span style="font-size-adjust: 0.5; font-size: 1.25rem">both</span></p>');
        expect(md).toContain('<span');
        expect(md).toContain('font-size: 1.25rem');
    });
});

