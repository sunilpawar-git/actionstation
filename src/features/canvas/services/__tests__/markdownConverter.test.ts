/** markdownConverter Tests - Validates markdown <-> HTML conversion */
import { describe, it, expect } from 'vitest';
import { markdownToHtml, htmlToMarkdown } from '../markdownConverter';

describe('markdownToHtml', () => {
    it('converts plain text to paragraph', () => {
        expect(markdownToHtml('Hello world')).toBe('<p>Hello world</p>');
    });

    it('converts bold text', () => {
        expect(markdownToHtml('**bold**')).toBe('<p><strong>bold</strong></p>');
    });

    it('converts italic text', () => {
        expect(markdownToHtml('*italic*')).toBe('<p><em>italic</em></p>');
    });

    it('converts headings', () => {
        expect(markdownToHtml('# Heading 1')).toBe('<h1>Heading 1</h1>');
        expect(markdownToHtml('## Heading 2')).toBe('<h2>Heading 2</h2>');
        expect(markdownToHtml('### Heading 3')).toBe('<h3>Heading 3</h3>');
    });

    it('converts unordered lists', () => {
        const md = '- Item 1\n- Item 2';
        const html = markdownToHtml(md);
        expect(html).toContain('<ul>');
        expect(html).toContain('<li><p>Item 1</p></li>');
        expect(html).toContain('<li><p>Item 2</p></li>');
    });

    it('converts ordered lists', () => {
        const md = '1. First\n2. Second';
        const html = markdownToHtml(md);
        expect(html).toContain('<ol>');
        expect(html).toContain('<li><p>First</p></li>');
        expect(html).toContain('<li><p>Second</p></li>');
    });

    it('converts inline code', () => {
        expect(markdownToHtml('Use `code` here')).toBe('<p>Use <code>code</code> here</p>');
    });

    it('converts code blocks', () => {
        const md = '```\nconst x = 1;\n```';
        const html = markdownToHtml(md);
        expect(html).toContain('<pre><code>const x = 1;\n</code></pre>');
    });

    it('converts blockquotes', () => {
        expect(markdownToHtml('> Quote text')).toBe('<blockquote><p>Quote text</p></blockquote>');
    });

    it('handles empty string', () => {
        expect(markdownToHtml('')).toBe('');
    });

    it('converts multiple paragraphs', () => {
        const md = 'First paragraph\n\nSecond paragraph';
        const html = markdownToHtml(md);
        expect(html).toContain('<p>First paragraph</p>');
        expect(html).toContain('<p>Second paragraph</p>');
    });
});

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

describe('markdownToHtml tables (GFM)', () => {
    it('converts basic 2-column table to table HTML', () => {
        const md = '| A | B |\n|---|---|\n| 1 | 2 |';
        const html = markdownToHtml(md);
        expect(html).toContain('<table>');
        expect(html).toContain('<thead>');
        expect(html).toContain('<tbody>');
    });

    it('renders th cells in thead', () => {
        const md = '| Name | Age |\n|---|---|\n| Alice | 30 |';
        const html = markdownToHtml(md);
        expect(html).toContain('<th>');
        expect(html).toContain('Name');
        expect(html).toContain('Age');
    });

    it('renders td cells in tbody', () => {
        const md = '| Name | Age |\n|---|---|\n| Alice | 30 |';
        const html = markdownToHtml(md);
        expect(html).toContain('<td>');
        expect(html).toContain('Alice');
        expect(html).toContain('30');
    });

    it('handles empty cell values', () => {
        const md = '| A | B |\n|---|---|\n|   | 2 |';
        const html = markdownToHtml(md);
        expect(html).toContain('<table>');
        expect(html).toContain('<td>');
    });

    it('renders table mixed with heading above and paragraph below', () => {
        const md = '## Comparison\n\n| X | Y |\n|---|---|\n| a | b |\n\nSome text';
        const html = markdownToHtml(md);
        expect(html).toContain('<h2>Comparison</h2>');
        expect(html).toContain('<table>');
        expect(html).toContain('<p>Some text</p>');
    });

    it('handles single-column table', () => {
        const md = '| Item |\n|---|\n| Alpha |\n| Beta |';
        const html = markdownToHtml(md);
        expect(html).toContain('<table>');
        expect(html).toContain('Alpha');
        expect(html).toContain('Beta');
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
        expect(md).not.toMatch(/^- Child/m); // must NOT appear at column 0
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
        // The Chapter 2 "Four Ds" case: user edited so only 2 of 4 items remain nested.
        // The bug: without a \n between <p> and <ul>, the sub-list prefix runs onto
        // the parent text line, causing the round-trip to produce wrong structure.
        const html =
            '<ul><li><p>The Four Ds: Deter an adversary, Detect an attack,</p>' +
            '<ul>' +
            '<li><p>Delay an attack, and</p></li>' +
            '<li><p>Deny an adversary access to the target.</p></li>' +
            '</ul></li></ul>';
        const md = htmlToMarkdown(html);
        // Parent text line must be its own line ending with the comma
        expect(md).toContain('- The Four Ds: Deter an adversary, Detect an attack,');
        // Sub-bullets must be on their own indented lines
        expect(md).toContain('  - Delay an attack, and');
        expect(md).toContain('  - Deny an adversary access to the target.');
        // Critically: sub-bullet must NOT be appended to the parent text on the same line
        expect(md).not.toMatch(/Detect an attack,[^\n]*- Delay/);
        expect(md).not.toMatch(/Detect an attack, {2}/); // no direct space-runon into indent
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
