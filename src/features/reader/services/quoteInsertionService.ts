/**
 * quoteInsertionService — Inserts attributed quotes into TipTap editor
 * as a single ProseMirror transaction (one undo step).
 *
 * Produces:
 * - blockquote with selected text
 * - attribution paragraph with visible metadata (filename, page)
 * - machine-readable data-attrs for downstream features
 */
import type { Editor } from '@tiptap/core';
import { sanitizeQuote } from './quoteSanitizer';
import { strings } from '@/shared/localization/strings';

export interface QuoteAttribution {
    sourceId: string;
    sourceType: string;
    filename: string;
    page?: number;
    nodeId: string;
}

/**
 * Insert an attributed blockquote into the editor in one transaction.
 * Returns true if insertion succeeded, false if skipped.
 */
export function insertQuoteIntoEditor(
    editor: Editor,
    selectedText: string,
    attribution: QuoteAttribution,
): boolean {
    if (editor.isDestroyed) return false;

    const sanitized = sanitizeQuote(selectedText);
    if (sanitized.length === 0) return false;

    const pageLabel = attribution.page != null ? ` p.${attribution.page}` : '';
    const attrLine = `— ${attribution.filename}${pageLabel}`;

    const attrAttrs = {
        'data-source-id': attribution.sourceId,
        'data-source-type': attribution.sourceType,
        'data-source-node': attribution.nodeId,
        ...(attribution.page != null ? { 'data-source-page': String(attribution.page) } : {}),
    };

    const attrHtmlParts = Object.entries(attrAttrs)
        .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
        .join(' ');

    const quoteHtml =
        `<blockquote><p>${escapeHtml(sanitized)}</p></blockquote>` +
        `<p ${attrHtmlParts}><em>${escapeHtml(attrLine)}</em></p>`;

    editor.chain().focus('end').insertContent(quoteHtml).run();

    return true;
}

/**
 * Build markdown string for a quote (used when creating new nodes).
 */
export function buildQuoteMarkdown(
    selectedText: string,
    attribution: QuoteAttribution,
): string {
    const sanitized = sanitizeQuote(selectedText);
    if (sanitized.length === 0) return '';

    const pageLabel = attribution.page != null ? ` p.${attribution.page}` : '';
    const safeFilename = escapeMarkdown(attribution.filename);
    const attrLine = `${safeFilename}${pageLabel}`;

    return `> ${sanitized}\n\n*— ${attrLine}*\n`;
}

/** Format toast notification for successful quote */
export function quoteSuccessMessage(): string {
    return strings.reader.quoteAdded;
}

/** Format toast notification for new node from quote */
export function nodeCreatedMessage(): string {
    return strings.reader.nodeCreated;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
    return str.replace(/"/g, '&quot;').replace(/&/g, '&amp;');
}

function escapeMarkdown(str: string): string {
    return str.replace(/([[\]*_~`#>|\\])/g, '\\$1');
}
