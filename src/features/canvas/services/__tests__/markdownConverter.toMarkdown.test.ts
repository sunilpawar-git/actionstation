/** markdownConverter — htmlToMarkdown conversion tests */
import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from '../markdownConverter';

describe('htmlToMarkdown', () => {
    it('converts paragraph to plain text', () => {
        expect(htmlToMarkdown('<p>Hello world</p>')).toBe('Hello world');
    });

    it('converts bold', () => {
        expect(htmlToMarkdown('<p><strong>bold</strong></p>')).toBe('**bold**');
    });

    it('converts italic', () => {
        expect(htmlToMarkdown('<p><em>italic</em></p>')).toBe('*italic*');
    });

    it('converts headings', () => {
        expect(htmlToMarkdown('<h1>Heading 1</h1>')).toBe('# Heading 1');
        expect(htmlToMarkdown('<h2>Heading 2</h2>')).toBe('## Heading 2');
        expect(htmlToMarkdown('<h3>Heading 3</h3>')).toBe('### Heading 3');
    });

    it('converts unordered lists', () => {
        const html = '<ul><li><p>Item 1</p></li><li><p>Item 2</p></li></ul>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('- Item 1');
        expect(md).toContain('- Item 2');
    });

    it('converts ordered lists', () => {
        const html = '<ol><li><p>First</p></li><li><p>Second</p></li></ol>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('1. First');
        expect(md).toContain('2. Second');
    });

    it('converts inline code', () => {
        expect(htmlToMarkdown('<p>Use <code>code</code> here</p>')).toBe('Use `code` here');
    });

    it('converts code blocks', () => {
        const html = '<pre><code>const x = 1;\n</code></pre>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('```');
        expect(md).toContain('const x = 1;');
    });

    it('converts blockquotes', () => {
        expect(htmlToMarkdown('<blockquote><p>Quote text</p></blockquote>')).toBe('> Quote text');
    });

    it('handles empty string', () => {
        expect(htmlToMarkdown('')).toBe('');
    });
});

describe('htmlToMarkdown multi-block', () => {
    it('separates heading from paragraph with blank line', () => {
        const html = '<h2>Title</h2><p>Body text</p>';
        expect(htmlToMarkdown(html)).toBe('## Title\n\nBody text');
    });

    it('separates multiple paragraphs with blank line', () => {
        const html = '<p>First</p><p>Second</p>';
        expect(htmlToMarkdown(html)).toBe('First\n\nSecond');
    });

    it('separates heading + paragraph + list + blockquote', () => {
        const html = '<h2>Notes</h2><p>Some text</p><ul><li><p>Item 1</p></li><li><p>Item 2</p></li></ul><blockquote><p>A quote</p></blockquote>';
        const md = htmlToMarkdown(html);
        expect(md).toBe('## Notes\n\nSome text\n\n- Item 1\n- Item 2\n\n> A quote');
    });

    it('separates heading from list', () => {
        const html = '<h1>Tasks</h1><ul><li><p>Do this</p></li><li><p>Do that</p></li></ul>';
        expect(htmlToMarkdown(html)).toBe('# Tasks\n\n- Do this\n- Do that');
    });
});

describe('htmlToMarkdown start attribute', () => {
    it('falls back to 1 when start attribute is invalid', () => {
        const html = '<ol start="abc"><li><p>First</p></li><li><p>Second</p></li></ol>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('1. First');
        expect(md).toContain('2. Second');
    });

    it('respects start attribute on ordered lists', () => {
        const html = '<ol start="3"><li><p>Third</p></li><li><p>Fourth</p></li></ol>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('3. Third');
        expect(md).toContain('4. Fourth');
    });
});

describe('htmlToMarkdown strikethrough', () => {
    it('converts <s> to ~~text~~', () => {
        expect(htmlToMarkdown('<p><s>removed</s></p>')).toBe('~~removed~~');
    });

    it('converts <del> to ~~text~~', () => {
        expect(htmlToMarkdown('<p><del>deleted</del></p>')).toBe('~~deleted~~');
    });

    it('converts strikethrough mixed with other inline marks', () => {
        expect(htmlToMarkdown('<p><strong><s>bold deleted</s></strong></p>'))
            .toBe('**~~bold deleted~~**');
    });
});

describe('htmlToMarkdown links', () => {
    it('converts <a> to [text](url)', () => {
        expect(htmlToMarkdown('<p><a href="https://example.com">click</a></p>'))
            .toBe('[click](https://example.com)');
    });

    it('converts <a> with only text content (no href) to plain text', () => {
        expect(htmlToMarkdown('<p><a>plain</a></p>')).toBe('plain');
    });

    it('strips javascript: protocol links (XSS prevention)', () => {
        expect(htmlToMarkdown('<p><a href="javascript:alert(1)">xss</a></p>'))
            .toBe('xss');
    });

    it('strips data: protocol links (security)', () => {
        expect(htmlToMarkdown('<p><a href="data:text/html,<script>alert(1)</script>">xss</a></p>'))
            .toBe('xss');
    });

    it('allows mailto: links', () => {
        expect(htmlToMarkdown('<p><a href="mailto:hi@example.com">email</a></p>'))
            .toBe('[email](mailto:hi@example.com)');
    });

    it('allows http: links', () => {
        expect(htmlToMarkdown('<p><a href="http://example.com">site</a></p>'))
            .toBe('[site](http://example.com)');
    });
});

describe('htmlToMarkdown tables', () => {
    it('converts table with thead/tbody to GFM markdown', () => {
        const html = '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('| A | B |');
        expect(md).toContain('| --- | --- |');
        expect(md).toContain('| 1 | 2 |');
    });

    it('escapes pipe characters in cell content', () => {
        const html = '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>x | y</td></tr></tbody></table>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('x \\| y');
    });

    it('handles table without thead (all rows in tbody)', () => {
        const html = '<table><tbody><tr><td>r1c1</td><td>r1c2</td></tr><tr><td>r2c1</td><td>r2c2</td></tr></tbody></table>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('|');
        expect(md).toContain('r1c1');
    });

    it('handles single-column table', () => {
        const html = '<table><thead><tr><th>Item</th></tr></thead><tbody><tr><td>Alpha</td></tr><tr><td>Beta</td></tr></tbody></table>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('| Item |');
        expect(md).toContain('| Alpha |');
        expect(md).toContain('| Beta |');
    });
});

describe('htmlToMarkdown nested lists — indentation', () => {
    it('indents sub-bullets under a parent bullet by 2 spaces', () => {
        const html = '<ul><li><p>Parent</p><ul><li><p>Child</p></li></ul></li></ul>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('- Parent');
        expect(md).toContain('  - Child');
        expect(md).not.toMatch(/^- Child/m);
    });

    it('indents multiple sub-bullets under a parent bullet — the Para 3 Assets case', () => {
        const html =
            '<ul><li><p>Cost-of-Loss Formula: K= Cp + Ct</p>' +
            '<ul>' +
            '<li><p>Cp = cost of permanent replacement</p></li>' +
            '<li><p>Ct = cost of temporary substitute</p></li>' +
            '<li><p>Cr = total related costs</p></li>' +
            '</ul></li></ul>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('- Cost-of-Loss Formula: K= Cp + Ct');
        expect(md).toContain('  - Cp = cost of permanent replacement');
        expect(md).toContain('  - Ct = cost of temporary substitute');
        expect(md).toContain('  - Cr = total related costs');
        expect(md).not.toMatch(/^- Cp /m);
        expect(md).not.toMatch(/^- Ct /m);
        expect(md).not.toMatch(/^- Cr /m);
    });

    it('indents sub-items under a top-level ordered list item', () => {
        const html =
            '<ol><li><p>First</p><ul><li><p>Sub A</p></li><li><p>Sub B</p></li></ul></li></ol>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('1. First');
        expect(md).toContain('  - Sub A');
        expect(md).toContain('  - Sub B');
        expect(md).not.toMatch(/^- Sub A/m);
    });

    it('handles 3-level nesting with correct indent per level', () => {
        const html =
            '<ul>' +
            '<li><p>L1</p>' +
            '<ul><li><p>L2</p>' +
            '<ul><li><p>L3</p></li></ul>' +
            '</li></ul>' +
            '</li></ul>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('- L1');
        expect(md).toContain('  - L2');
        expect(md).toContain('    - L3');
    });

    it('separates parent <p> text from nested <ul> with a newline — no run-on', () => {
        const html =
            '<ul><li><p>The Four Ds: Deter an adversary, Detect an attack,</p>' +
            '<ul>' +
            '<li><p>Delay an attack, and</p></li>' +
            '<li><p>Deny an adversary access to the target.</p></li>' +
            '</ul></li></ul>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('- The Four Ds: Deter an adversary, Detect an attack,');
        expect(md).toContain('  - Delay an attack, and');
        expect(md).toContain('  - Deny an adversary access to the target.');
        expect(md).not.toMatch(/Detect an attack,[^\n]*- Delay/);
        expect(md).not.toMatch(/Detect an attack, {2}/);
    });

    it('parent <p> text and nested <ol> are separated by newline', () => {
        const html =
            '<ul><li><p>Parent with sub-steps:</p>' +
            '<ol><li><p>Step one</p></li><li><p>Step two</p></li></ol>' +
            '</li></ul>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('- Parent with sub-steps:');
        expect(md).toContain('  1. Step one');
        expect(md).toContain('  2. Step two');
        expect(md).not.toMatch(/sub-steps:[^\n]*1\./);
    });
});
