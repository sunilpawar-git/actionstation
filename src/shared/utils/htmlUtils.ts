/** Shared HTML utility functions */

export const HTML_TAG_RE = /<[^>]*>/g;

export function stripHtmlTags(text: string): string {
    return text.replace(HTML_TAG_RE, ' ');
}
