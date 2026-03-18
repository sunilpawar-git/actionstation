/**
 * markdownConverter — Highlight (mark) round-trip tests
 * TDD: RED phase — these tests must fail before the fix is applied.
 *
 * Root cause: elementToMarkdown had no `mark` case, so <mark style="...">
 * was silently stripped to plain text during htmlToMarkdown(), causing
 * highlight colors to vanish when switching from focus mode to node mode.
 */
import { describe, it, expect } from 'vitest';
import { htmlToMarkdown, markdownToHtml } from '../markdownConverter';

// ─── htmlToMarkdown ───────────────────────────────────────────────────────────

describe('htmlToMarkdown — highlight mark preservation', () => {
    it('preserves <mark> with a style attribute as raw HTML in the markdown string', () => {
        const html = '<p><mark style="background-color: var(--highlight-yellow)">hello</mark></p>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('<mark');
        expect(md).toContain('var(--highlight-yellow)');
        expect(md).toContain('hello');
    });

    it('preserves the text content of the mark', () => {
        const html = '<p><mark style="background-color: var(--highlight-green)">important</mark></p>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('important');
    });

    it('preserves all five highlight colour variables', () => {
        const colors = [
            'var(--highlight-yellow)',
            'var(--highlight-green)',
            'var(--highlight-blue)',
            'var(--highlight-pink)',
            'var(--highlight-purple)',
        ];
        for (const color of colors) {
            const html = `<p><mark style="background-color: ${color}">text</mark></p>`;
            const md = htmlToMarkdown(html);
            expect(md).toContain(color);
        }
    });

    it('preserves a mark that is inline within surrounding text', () => {
        const html =
            '<p>before <mark style="background-color: var(--highlight-blue)">middle</mark> after</p>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('before');
        expect(md).toContain('middle');
        expect(md).toContain('after');
        expect(md).toContain('var(--highlight-blue)');
    });

    it('strips a <mark> without a style attribute gracefully (returns plain text)', () => {
        const html = '<p><mark>plain</mark></p>';
        const md = htmlToMarkdown(html);
        // Without a colour the mark is meaningless — fall back to plain text
        expect(md).toContain('plain');
    });
});

// ─── Full round-trip ──────────────────────────────────────────────────────────

describe('highlight mark full round-trip (html → markdown → html)', () => {
    it('restores the mark tag after markdown → html conversion', () => {
        const original = '<p><mark style="background-color: var(--highlight-yellow)">hello</mark></p>';
        const md = htmlToMarkdown(original);
        const restored = markdownToHtml(md);
        expect(restored).toContain('<mark');
        expect(restored).toContain('var(--highlight-yellow)');
        expect(restored).toContain('hello');
    });

    it('restores inline mark within surrounding text after round-trip', () => {
        const original =
            '<p>before <mark style="background-color: var(--highlight-pink)">mid</mark> after</p>';
        const md = htmlToMarkdown(original);
        const restored = markdownToHtml(md);
        expect(restored).toContain('before');
        expect(restored).toContain('mid');
        expect(restored).toContain('after');
        expect(restored).toContain('var(--highlight-pink)');
    });

    it('survives a round-trip alongside bold text', () => {
        const original =
            '<p><strong>bold</strong> and <mark style="background-color: var(--highlight-green)">green</mark></p>';
        const md = htmlToMarkdown(original);
        const restored = markdownToHtml(md);
        expect(restored).toContain('bold');
        expect(restored).toContain('green');
        expect(restored).toContain('var(--highlight-green)');
    });
});
