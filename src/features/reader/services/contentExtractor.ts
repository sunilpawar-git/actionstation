/**
 * contentExtractor — Extracts article content from web URLs using
 * Mozilla Readability (the engine behind Firefox Reader View).
 *
 * Uses the browser's native DOMParser to parse fetched HTML, avoiding
 * any CSP or iframe issues. Fetching is done via the fetchArticleHtml
 * Cloud Function to bypass CORS restrictions on target sites.
 */
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import type { SafeReaderUrl, ArticleReaderSource } from '../types/reader';
import { captureError } from '@/shared/services/sentryService';
import { strings } from '@/shared/localization/strings';
import { getAuthToken } from '@/features/auth/services/authTokenService';
import { getFetchArticleHtmlUrl, isProxyConfigured } from '@/config/linkPreviewConfig';

export interface ExtractedArticle {
    title: string;
    content: string;
    excerpt: string;
    siteName: string | null;
    byline: string | null;
}

/**
 * Fetch a URL and extract article content via Readability.
 * Uses the fetchArticleHtml Cloud Function to bypass CORS restrictions.
 * Falls back to a direct fetch when the proxy fails (CORS, 4xx, network).
 * Returns null if neither method succeeds.
 */
export async function extractArticleContent(
    url: SafeReaderUrl,
    signal?: AbortSignal,
): Promise<ExtractedArticle | null> {
    let html: string | null = null;

    if (isProxyConfigured()) {
        try {
            html = await fetchViaProxy(url, signal);
        } catch (proxyErr) {
            captureError(proxyErr, { context: 'contentExtractor.proxy', url });
            try {
                html = await fetchDirect(url, signal);
            } catch (directErr) {
                captureError(directErr, { context: 'contentExtractor.directFallback', url });
                return null;
            }
        }
    } else {
        try {
            html = await fetchDirect(url, signal);
        } catch (err) {
            captureError(err, { context: 'contentExtractor.fetch', url });
            return null;
        }
    }

    if (!html) return null;
    return parseArticleFromHtml(html, url);
}

/** Fetch via fetchArticleHtml Cloud Function (production path, bypasses CORS) */
async function fetchViaProxy(url: string, signal?: AbortSignal): Promise<string> {
    const token = await getAuthToken();
    const response = await fetch(getFetchArticleHtmlUrl(), {
        method: 'POST',
        signal,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url }),
    });
    if (!response.ok) throw new Error(`Proxy fetch failed: ${response.status}`);
    const data = await response.json() as { html?: string; error?: string };
    if (!data.html) throw new Error(data.error ?? 'No HTML returned from proxy');
    return data.html;
}

/** Direct fetch fallback — only works for CORS-permissive sites or same-origin */
async function fetchDirect(url: string, signal?: AbortSignal): Promise<string> {
    const response = await fetch(url, {
        signal,
        headers: { Accept: 'text/html' },
    });
    if (!response.ok) throw new Error(`Direct fetch failed: ${response.status}`);
    return response.text();
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
