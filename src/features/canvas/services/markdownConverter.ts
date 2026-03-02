/**
 * Markdown Converter - Markdown <-> HTML conversion for TipTap editor
 * Uses unified/remark/rehype pipeline with custom AST plugins for
 * robust parsing and TipTap-compatible output.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { rehypeWrapListItems, rehypeFixOlContinuity, rehypeCompact, rehypeUnwrapImages } from './rehypePlugins';
import { isSafeImageSrc } from '../extensions/imageExtension';

/** Unified processor — built once, reused for every conversion */
const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)               // GFM: tables, strikethrough, task lists, autolinks
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeCompact)           // Strip whitespace text nodes first
    .use(rehypeUnwrapImages)      // Unwrap <img> from <p> for TipTap block compatibility
    .use(rehypeWrapListItems)     // Then wrap bare <li> content in <p>
    .use(rehypeFixOlContinuity)   // Then fix sequential <ol> numbering
    .use(rehypeStringify, { allowDangerousHtml: true });

/** Convert markdown string to HTML for TipTap consumption */
export function markdownToHtml(markdown: string): string {
    if (!markdown) return '';
    return String(processor.processSync(markdown));
}

/** Convert HTML string to markdown for store persistence */
export function htmlToMarkdown(html: string): string {
    if (!html) return '';

    const doc = new DOMParser().parseFromString(html, 'text/html');
    return nodeToMarkdown(doc.body).trim();
}

/** Heading tag to markdown prefix mapping */
const HEADING_PREFIXES: Record<string, string> = {
    h1: '# ', h2: '## ', h3: '### ', h4: '#### ', h5: '##### ', h6: '###### ',
};

/** Tags that represent block-level elements requiring newline separation */
const BLOCK_TAGS = new Set([
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre', 'img', 'hr', 'table',
]);

/** Table sub-tags handled wholesale by tableToMarkdown — must not enter recursive childMd path */
const TABLE_SUB_TAGS = new Set(['thead', 'tbody', 'tr', 'td', 'th']);

/** Recursively convert DOM node tree to markdown */
function nodeToMarkdown(node: Node, depth = 0): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    // Container elements (div, body) join block children with newlines
    if (tag === 'div' || tag === 'body') {
        return joinBlockChildren(el, depth);
    }

    const childMd = Array.from(el.childNodes).map(n => nodeToMarkdown(n, depth)).join('');
    return elementToMarkdown(el, tag, childMd, depth);
}

/** Join block-level children with blank-line separators for unambiguous markdown */
function joinBlockChildren(el: Element, depth = 0): string {
    const parts: string[] = [];
    for (const child of Array.from(el.childNodes)) {
        const md = nodeToMarkdown(child, depth);
        if (!md && child.nodeType !== Node.ELEMENT_NODE) continue;
        if (child.nodeType !== Node.ELEMENT_NODE) { parts.push(md); continue; }
        const tag = (child as Element).tagName.toLowerCase();

        // Skip empty elements that aren't inherently self-closing/empty like hr or img
        if (!md && tag !== 'hr' && tag !== 'br' && tag !== 'img') continue;

        if (BLOCK_TAGS.has(tag) && parts.length > 0) {
            parts.push('\n\n');
        }
        parts.push(md);
    }
    return parts.join('');
}

/** Convert a single element to markdown based on its tag */
function elementToMarkdown(el: Element, tag: string, childMd: string, depth = 0): string {
    if (tag === 'table') return tableToMarkdown(el);
    // Sub-tags are owned by tableToMarkdown; returning '' prevents double-rendering
    if (TABLE_SUB_TAGS.has(tag)) return '';
    if (tag === 'strong' || tag === 'b') return `**${childMd}**`;
    if (tag === 'em' || tag === 'i') return `*${childMd}*`;
    if (tag === 'code') return codeToMarkdown(el, childMd);
    if (tag === 'img') return imageToMarkdown(el);
    if (tag in HEADING_PREFIXES) return `${HEADING_PREFIXES[tag]}${childMd}`;
    // Prefix each line with '> ' so multi-line blockquote content (e.g. <br>-separated)
    // is correctly serialized rather than having all newlines stripped.
    if (tag === 'blockquote') return childMd.split('\n').map(l => `> ${l}`).join('\n');
    if (tag === 'pre') return `\`\`\`\n${childMd}\`\`\``;
    if (tag === 'ul') return convertList(el, false, depth);
    if (tag === 'ol') return convertList(el, true, depth);
    // Note: 'li' is intentionally absent — convertList builds <li> content
    // directly via its liParts loop and never dispatches through elementToMarkdown.
    if (tag === 'br') return '\n';
    if (tag === 'hr') return '---';
    return childMd;
}

/** Escape pipe characters in GFM table cell text to prevent parse corruption */
function escapeCellText(text: string): string {
    return text.replace(/\|/g, '\\|');
}

/** Extract plain text from a table cell element (ignoring nested block tags) */
function cellText(cell: Element): string {
    return escapeCellText((cell.textContent ?? '').trim());
}

/**
 * Serialize an HTML <table> element to GFM pipe-table markdown.
 * Handles: thead (as header row), tbody rows, missing thead, pipe escaping.
 * Does NOT support colspan/rowspan — GFM tables have no spanning syntax.
 */
function tableToMarkdown(table: Element): string {
    const headerCells = Array.from(table.querySelectorAll('thead tr th'));
    const bodyRows = Array.from(table.querySelectorAll('tbody tr'));

    if (headerCells.length === 0 && bodyRows.length === 0) return '';

    const lines: string[] = [];

    if (headerCells.length > 0) {
        // Header row + separator
        lines.push(`| ${headerCells.map(cellText).join(' | ')} |`);
        lines.push(`| ${headerCells.map(() => '---').join(' | ')} |`);
        // Body rows
        for (const row of bodyRows) {
            const cells = Array.from(row.querySelectorAll('td, th'));
            lines.push(`| ${cells.map(cellText).join(' | ')} |`);
        }
    } else {
        // No thead — treat all rows as data; synthesise separator after first row
        const allRows = Array.from(table.querySelectorAll('tr'));
        allRows.forEach((row, idx) => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            lines.push(`| ${cells.map(cellText).join(' | ')} |`);
            if (idx === 0) {
                lines.push(`| ${cells.map(() => '---').join(' | ')} |`);
            }
        });
    }

    return lines.join('\n');
}

/** Handle code element (inline vs inside pre) */
function codeToMarkdown(el: Element, childMd: string): string {
    if (el.parentElement?.tagName.toLowerCase() === 'pre') return childMd;
    return `\`${childMd}\``;
}

/** Regex to validate width is numeric-only (prevents injection) */
const NUMERIC_ONLY = /^\d+$/;

/** Escape HTML special characters in attribute values to prevent injection */
function escapeAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Convert img element to markdown — preserves width via raw HTML when present */
function imageToMarkdown(el: Element): string {
    const src = el.getAttribute('src') ?? '';
    const rawAlt = el.getAttribute('alt') ?? '';
    if (!src || !isSafeImageSrc(src)) return '';
    const safeAlt = rawAlt.replace(/[[\]]/g, '');
    const width = el.getAttribute('width');
    if (width && NUMERIC_ONLY.test(width)) {
        return `<img src="${src}" alt="${escapeAttr(safeAlt)}" width="${width}">`;
    }
    return `![${safeAlt}](${src})`;
}

/** Convert list element to markdown, indenting by 2 spaces per nesting depth */
function convertList(el: Element, ordered: boolean, depth = 0): string {
    const parsed = parseInt(el.getAttribute('start') ?? '1', 10);
    const safeStart = Number.isNaN(parsed) ? 1 : parsed;
    const start = ordered ? safeStart : 0;
    const indent = '  '.repeat(depth);
    // Use .children (element nodes only) — per HTML spec, only <li> elements are
    // valid direct children of <ul>/<ol>; text nodes between items are ignorable.
    const items = Array.from(el.children);
    return items
        .map((li, idx) => {
            const prefix = ordered ? `${start + idx}. ` : '- ';
            // Build the <li> content by iterating child nodes and inserting a newline
            // before each block-level element that follows prior content.
            // This ensures <p>text</p><ul>...</ul> becomes "text\n  - child"
            // rather than "text  - child" (which corrupts round-trip parsing).
            const liParts: string[] = [];
            for (const child of Array.from(li.childNodes)) {
                const childMd = nodeToMarkdown(child, depth + 1);
                if (!childMd) continue;
                const tag = child.nodeType === Node.ELEMENT_NODE
                    ? (child as Element).tagName.toLowerCase() : '';
                // Insert newline separator before a block element when content already exists
                if (BLOCK_TAGS.has(tag) && liParts.length > 0) {
                    liParts.push('\n');
                }
                liParts.push(childMd);
            }
            const liMd = liParts.join('').replace(/^\n+|\n+$/g, '');
            // Prepend the current-depth indent+prefix to the first line only;
            // subsequent lines (nested list items) already carry their own indent.
            return liMd
                .split('\n')
                .map((line, i) => (i === 0 ? `${indent}${prefix}${line}` : line))
                .join('\n');
        })
        .join('\n');
}
