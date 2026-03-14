/**
 * quoteSanitizer — Normalizes, sanitizes, and deduplicates quote text.
 * Pure functions for the quote-to-note pipeline.
 */

const MAX_QUOTE_LENGTH = 2000;

/** Normalize whitespace: collapse runs of spaces/newlines to single space, trim */
export function normalizeQuoteText(raw: string): string {
    return raw.replace(/\s+/g, ' ').trim();
}

/** Truncate to max length at word boundary */
export function enforceMaxLength(text: string, max = MAX_QUOTE_LENGTH): string {
    if (text.length <= max) return text;
    const truncated = text.slice(0, max);
    const lastSpace = truncated.lastIndexOf(' ');
    return `${lastSpace > max * 0.8 ? truncated.slice(0, lastSpace) : truncated}…`;
}

/** Fast hash for dedupe within a session */
export function selectionFingerprint(sourceId: string, page: number | undefined, text: string): string {
    const normalized = normalizeQuoteText(text).toLowerCase();
    return `${sourceId}:${page ?? 0}:${simpleHash(normalized)}`;
}

function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash + char) | 0;
    }
    return hash >>> 0;
}

/** Sanitize quote text: strip HTML tags, normalize, enforce length */
export function sanitizeQuote(raw: string): string {
    const stripped = raw.replace(/<[^>]*>/g, '');
    const normalized = normalizeQuoteText(stripped);
    return enforceMaxLength(normalized);
}

export { MAX_QUOTE_LENGTH };
