/** Shared HTML utility functions */

export const HTML_TAG_RE = /<[^>]*>/g;

/**
 * Strip HTML tags for plain-text extraction (tokenization, scoring, etc.).
 *
 * **NOT an HTML sanitizer.** Do not use the output for `innerHTML` or
 * `dangerouslySetInnerHTML`. For sanitized rendering use DOMPurify or
 * the React default JSX auto-escaping.
 */
export function stripHtmlTags(text: string): string {
    return text.replace(HTML_TAG_RE, ' ');
}
