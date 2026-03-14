/**
 * contentExtractor — Extracts article content from web URLs using
 * Mozilla Readability (the engine behind Firefox Reader View).
 *
 * Uses the browser's native DOMParser to parse fetched HTML, avoiding
 * any CSP or iframe issues. For cross-origin URLs, a proxy/Cloud Function
 * is recommended for production use.
 */
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import type { SafeReaderUrl, ArticleReaderSource } from '../types/reader';
import { captureError } from '@/shared/services/sentryService';
import { strings } from '@/shared/localization/strings';

export interface ExtractedArticle {
    title: string;
    content: string;
    excerpt: string;
    siteName: string | null;
    byline: string | null;
}

/**
 * Fetch a URL and extract article content via Readability.
 * Returns null if the URL cannot be fetched or parsed.
 */
export async function extractArticleContent(
    url: SafeReaderUrl,
    signal?: AbortSignal,
): Promise<ExtractedArticle | null> {
    let html: string;
    try {
        const response = await fetch(url, {
            signal,
            headers: { Accept: 'text/html' },
        });
        if (!response.ok) return null;
        html = await response.text();
    } catch (err) {
        captureError(err, { context: 'contentExtractor.fetch', url });
        return null;
    }

    return parseArticleFromHtml(html, url);
}

/** Parse article content from raw HTML string (testable without fetch) */
export function parseArticleFromHtml(html: string, url: string): ExtractedArticle | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const baseEl = doc.createElement('base');
    baseEl.href = url;
    doc.head.appendChild(baseEl);

    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article?.content) return null;

    return {
        title: article.title ?? new URL(url).hostname,
        content: DOMPurify.sanitize(article.content),
        excerpt: article.excerpt ?? '',
        siteName: article.siteName ?? null,
        byline: article.byline ?? null,
    };
}

/** Build an ArticleReaderSource from extracted content */
export function buildArticleSource(
    url: SafeReaderUrl,
    article: ExtractedArticle,
): ArticleReaderSource {
    return {
        type: 'article',
        url,
        filename: article.title || strings.reader.readerPanel,
        sourceId: `article-${simpleUrlHash(url)}`,
        mime: 'text/html',
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
    };
}

function simpleUrlHash(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(36);
}
