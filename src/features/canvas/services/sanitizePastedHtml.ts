/**
 * sanitizePastedHtml — Strips unsafe attributes from pasted rich HTML.
 *
 * Rich pastes from Google Docs, Word, web pages, etc. carry inline styles,
 * classes, event handlers, and tracking attributes that pollute the editor.
 * This function keeps only semantically meaningful attributes (href, src, alt,
 * width, data-attachment) and removes everything else.
 */

/** Attributes preserved per-tag. All other attributes are stripped. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
    a: new Set(['href', 'rel', 'target']),
    img: new Set(['src', 'alt', 'width']),
};

/** Global attribute that is preserved on any element */
const GLOBAL_ALLOWED = new Set(['data-attachment']);

/** Sanitize a single element: strip all non-allowed attributes */
function sanitizeElement(el: Element): void {
    const tag = el.tagName.toLowerCase();
    const tagAllowed = ALLOWED_ATTRS[tag];
    const toRemove: string[] = [];

    for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (GLOBAL_ALLOWED.has(name)) continue;
        if (tagAllowed?.has(name)) continue;
        toRemove.push(attr.name);
    }

    for (const name of toRemove) {
        el.removeAttribute(name);
    }
}

/** Walk the DOM tree and sanitize every element */
function walkAndSanitize(node: Node): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
        sanitizeElement(node as Element);
    }
    for (const child of Array.from(node.childNodes)) {
        walkAndSanitize(child);
    }
}

/** Strip unsafe attributes from pasted HTML, preserving structure and safe attrs */
export function sanitizePastedHtml(html: string): string {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    walkAndSanitize(doc.body);
    return doc.body.innerHTML;
}
