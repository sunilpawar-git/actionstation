/**
 * fetchArticleHtml Cloud Function — Securely fetches raw HTML for article reading.
 *
 * The client (contentExtractor.ts) parses the returned HTML via @mozilla/readability
 * and sanitizes it with DOMPurify. This function handles only the server-side fetch
 * so that CORS restrictions on the target site are bypassed server-side.
 *
 * Security: validates URL, checks auth, enforces rate limits, prevents SSRF.
 * Returns raw HTML (not parsed) so parsing happens client-side with DOMPurify.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { verifyAuthToken } from './utils/authVerifier.js';
import { validateUrlWithDns } from './utils/urlValidator.js';
import { checkRateLimit } from './utils/rateLimiter.js';
import { ALLOWED_ORIGINS } from './utils/corsConfig.js';
import { readTextWithLimit } from './utils/streamReader.js';
import {
    errorMessages,
    ARTICLE_RATE_LIMIT,
    FETCH_TIMEOUT_MS,
    MAX_HTML_SIZE_BYTES,
} from './utils/securityConstants.js';

interface FetchArticleHtmlRequest {
    url?: string;
}

/**
 * Core handler extracted for testability.
 * Returns { html: string } on success, or { error: string } on failure.
 */
export async function handleFetchArticleHtml(
    body: FetchArticleHtmlRequest,
    uid: string,
): Promise<{ status: number; data: Record<string, unknown> }> {
    const { url } = body;

    if (!url || typeof url !== 'string') {
        return { status: 400, data: { error: errorMessages.invalidUrl } };
    }

    if (!await checkRateLimit(uid, 'fetchArticleHtml', ARTICLE_RATE_LIMIT)) {
        return { status: 429, data: { error: errorMessages.rateLimited } };
    }

    const validation = await validateUrlWithDns(url);
    if (!validation.valid) {
        return { status: 400, data: { error: validation.error } };
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            redirect: 'follow',
        });

        clearTimeout(timeout);

        if (!response.ok) {
            return { status: 200, data: { error: errorMessages.fetchFailed } };
        }

        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > MAX_HTML_SIZE_BYTES) {
            return { status: 200, data: { error: errorMessages.responseTooLarge } };
        }

        const html = await readTextWithLimit(response, MAX_HTML_SIZE_BYTES);
        if (!html) {
            return { status: 200, data: { error: errorMessages.responseTooLarge } };
        }

        return { status: 200, data: { html, url } };
    } catch {
        return { status: 200, data: { error: errorMessages.fetchFailed } };
    }
}

/**
 * Cloud Function entry point.
 * POST /fetchArticleHtml { url: string }
 * Requires Firebase Auth token in Authorization header.
 * Returns { html: string, url: string } or { error: string }.
 */
export const fetchArticleHtml = onRequest(
    { cors: ALLOWED_ORIGINS, maxInstances: 10 },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: errorMessages.methodNotAllowed });
            return;
        }

        const uid = await verifyAuthToken(req.headers.authorization);
        if (!uid) {
            res.status(401).json({ error: errorMessages.authRequired });
            return;
        }

        const result = await handleFetchArticleHtml(
            req.body as FetchArticleHtmlRequest,
            uid,
        );
        res.status(result.status).json(result.data);
    },
);
