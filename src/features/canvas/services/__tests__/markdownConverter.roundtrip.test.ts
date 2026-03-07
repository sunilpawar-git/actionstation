/** markdownConverter Tests - Round-trip (markdown ↔ HTML ↔ markdown) */
import { describe, it, expect } from 'vitest';
import { markdownToHtml, htmlToMarkdown } from '../markdownConverter';

describe('round-trip', () => {
    it('preserves plain text', () => {
        const md = 'Hello world';
        expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });

    it('preserves bold text', () => {
        const md = '**bold text**';
        expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });

    it('preserves italic text', () => {
        const md = '*italic text*';
        expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });

    it('preserves headings', () => {
        expect(htmlToMarkdown(markdownToHtml('# Heading 1'))).toBe('# Heading 1');
        expect(htmlToMarkdown(markdownToHtml('## Heading 2'))).toBe('## Heading 2');
    });

    it('preserves blockquotes', () => {
        expect(htmlToMarkdown(markdownToHtml('> Quote text'))).toBe('> Quote text');
    });

    it('preserves multi-block document', () => {
        const md = '## Title\n\nBody with **bold** and *italic*\n\n- Item 1\n- Item 2\n\n> A quote';
        expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });

    it('preserves AI output with bold paragraphs and bullet lists', () => {
        const md = [
            '**1. Self-Assessment: Where Are You Now?**',
            '',
            '- **Quadrants:** Assess your current state',
            '- **Levels:** Identify your dominant level',
            '',
            '**2. Targeted Development:**',
            '',
            '- **Prioritize:** Developing your weakest quadrant',
            '- **Actionable Steps:** Choose one specific goal',
        ].join('\n');
        const result = htmlToMarkdown(markdownToHtml(md));
        expect(result).toBe(md);
    });

    it('preserves loose ordered list numbering through round-trip', () => {
        const md = '1. First\n\n1. Second\n\n1. Third';
        const result = htmlToMarkdown(markdownToHtml(md));
        expect(result).toContain('1. First');
        expect(result).toContain('2. Second');
        expect(result).toContain('3. Third');
    });
    it('preserves strikethrough text', () => {
        const md = '~~deleted text~~';
        expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });

    it('preserves strikethrough inside a sentence', () => {
        const md = 'This has ~~removed~~ content';
        expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });
    it('preserves link text and URL', () => {
        const md = '[example](https://example.com)';
        expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });

    it('preserves link inside a sentence', () => {
        const md = 'Visit [our site](https://example.com) today';
        expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });
});

describe('round-trip tables (GFM)', () => {
    it('preserves basic 2-column table', () => {
        const md = '| A | B |\n| --- | --- |\n| 1 | 2 |';
        const result = htmlToMarkdown(markdownToHtml(md));
        expect(result).toContain('| A | B |');
        expect(result).toContain('| --- | --- |');
        expect(result).toContain('| 1 | 2 |');
    });

    it('preserves table mixed with heading and paragraph', () => {
        const md = '## Comparison\n\n| X | Y |\n| --- | --- |\n| a | b |\n\nSome text';
        const result = htmlToMarkdown(markdownToHtml(md));
        expect(result).toContain('## Comparison');
        expect(result).toContain('| X | Y |');
        expect(result).toContain('| --- | --- |');
        expect(result).toContain('| a | b |');
        expect(result).toContain('Some text');
    });

    it('preserves single-column table', () => {
        const md = '| Item |\n| --- |\n| Alpha |\n| Beta |';
        const result = htmlToMarkdown(markdownToHtml(md));
        expect(result).toContain('| Item |');
        expect(result).toContain('| --- |');
        expect(result).toContain('| Alpha |');
        expect(result).toContain('| Beta |');
    });
});

describe('round-trip nested lists — indentation (regression)', () => {
    it('preserves nested bullet indentation through round-trip — Para 3 Assets case', () => {
        // Exact structure from the "3. Assets:" section node (Cost-of-Loss sub-bullets)
        const md = [
            '- Asset Identification: Identifying all assets is critical for estimating risk.',
            '- Asset Valuation: Can be quantitative (numerical), qualitative (interviews, surveys), or a combination.',
            '- Criticality: The impact of loss measured in currency.',
            '- Cost-of-Loss Formula: Asset values can be quantified using the formula: K= Cp + Ct + Cr + Ci - I- - K = total cost of loss',
            '  - Cp = cost of permanent replacement',
            '  - Ct = cost of temporary substitute',
            '  - Cr = total related costs (removal, installation)',
            '  - Ci = lost income cost',
            '  - I = available insurance or indemnity',
        ].join('\n');
        const result = htmlToMarkdown(markdownToHtml(md));
        // Sub-bullets must survive the round-trip as indented items
        expect(result).toContain('  - Cp = cost of permanent replacement');
        expect(result).toContain('  - Ct = cost of temporary substitute');
        expect(result).toContain('  - Cr = total related costs (removal, installation)');
        expect(result).toContain('  - Ci = lost income cost');
        expect(result).toContain('  - I = available insurance or indemnity');
        // They must NOT appear at the top level
        expect(result).not.toMatch(/^- Cp /m);
        expect(result).not.toMatch(/^- Ct /m);
        expect(result).not.toMatch(/^- Cr /m);
    });

    it('preserves 2-level nested unordered list through round-trip', () => {
        const md = '- Parent\n  - Child A\n  - Child B';
        const result = htmlToMarkdown(markdownToHtml(md));
        expect(result).toContain('- Parent');
        expect(result).toContain('  - Child A');
        expect(result).toContain('  - Child B');
        expect(result).not.toMatch(/^- Child/m);
    });
});

describe("round-trip nested lists — block separator (regression)", () => {
    it("preserves parent-bullet text with partial sub-bullets — Chapter 2 Four Ds case", () => {
        const md = [
            "- The Four Ds must: Deter an adversary, Detect an attack,",
            "  - Delay an attack, and",
            "  - Deny an adversary access to the target.",
            "- These four principles should be the basis for all physical security projects.",
        ].join("\n");
        const result = htmlToMarkdown(markdownToHtml(md));
        expect(result).toContain("- The Four Ds must: Deter an adversary, Detect an attack,");
        expect(result).toContain("  - Delay an attack, and");
        expect(result).toContain("  - Deny an adversary access to the target.");
        expect(result).not.toMatch(/^- Delay/m);
        expect(result).not.toMatch(/^- Deny/m);
        expect(result).not.toMatch(/Detect an attack,[^\n]*-/);
    });

    it("preserves parent-bullet with nested ordered sub-steps through round-trip", () => {
        const md = "- Parent with sub-steps:\n  1. Step one\n  2. Step two";
        const result = htmlToMarkdown(markdownToHtml(md));
        expect(result).toContain("- Parent with sub-steps:");
        expect(result).toContain("  1. Step one");
        expect(result).toContain("  2. Step two");
        expect(result).not.toMatch(/sub-steps:[^\n]*1\./);
    });
});
