/**
 * fetchLinkMeta Cloud Function - Securely fetches and parses link preview metadata
 * Validates URL, checks auth, enforces rate limits, prevents SSRF
 */
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { verifyAuthToken } from './utils/authVerifier.js';
import { validateUrlWithDns } from './utils/urlValidator.js';
import { parseMetaTags, extractDomain } from './utils/metaParser.js';
import { checkRateLimit } from './utils/rateLimiter.js';
import { ALLOWED_ORIGINS } from './utils/corsConfig.js';
import { createSignedParams } from './utils/urlSigner.js';
import { readTextWithLimit } from './utils/streamReader.js';
import {
    errorMessages,
    META_RATE_LIMIT,
    FETCH_TIMEOUT_MS,
    MAX_HTML_SIZE_BYTES,
    FUNCTIONS_BASE_URL,
} from './utils/securityConstants.js';

const urlSigningSecret = defineSecret('URL_SIGNING_SECRET');

/** Request body shape for fetchLinkMeta */
interface FetchLinkMetaRequest {
    url?: string;
}

/**
 * Core handler logic extracted for testability.
 * When signingSecret is provided, image/favicon URLs are returned as signed proxy URLs.
 */
export async function handleFetchLinkMeta(
    body: FetchLinkMetaRequest,
    uid: string,
    signingSecret?: string,
): Promise<{ status: number; data: Record<string, unknown> }> {
    const { url } = body;

    if (!url || typeof url !== 'string') {
        return { status: 400, data: { error: errorMessages.invalidUrl } };
    }

    // Rate limit check
    if (!await checkRateLimit(uid, 'fetchLinkMeta', META_RATE_LIMIT)) {
        return { status: 429, data: { error: errorMessages.rateLimited } };
    }

    // URL validation with SSRF protection
    const validation = await validateUrlWithDns(url);
    if (!validation.valid) {
        return { status: 400, data: { error: validation.error } };
    }

    // Fetch the page HTML server-side
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'EdenLinkPreviewBot/1.0',
                'Accept': 'text/html,application/xhtml+xml',
            },
            // Node's fetch follows up to 20 redirects by default; FETCH_TIMEOUT_MS
            // is the hard backstop against redirect chains consuming function time.
            redirect: 'follow',
        });

        clearTimeout(timeout);

        if (!response.ok) {
            return { status: 200, data: buildErrorMetadata(url) };
        }

        // Fast-path: reject if Content-Length header declares an oversized body.
        // Content-Length is advisory; servers may omit or lie. The streaming read
        // below enforces the hard limit mid-transfer regardless.
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > MAX_HTML_SIZE_BYTES) {
            return { status: 200, data: buildErrorMetadata(url) };
        }

        // Stream HTML with a byte limit to prevent OOM from adversarial servers
        // that omit Content-Length and stream arbitrarily large bodies.
        const html = await readTextWithLimit(response, MAX_HTML_SIZE_BYTES);
        if (!html) {
            return { status: 200, data: buildErrorMetadata(url) };
        }

        const metadata = parseMetaTags(html, url);
        const data: Record<string, unknown> = { ...metadata };

        if (signingSecret && FUNCTIONS_BASE_URL) {
            data.proxyImage = buildSignedProxyUrl(metadata.image, signingSecret);
            data.proxyFavicon = buildSignedProxyUrl(metadata.favicon, signingSecret);
        }

        return { status: 200, data };
    } catch {
        return { status: 200, data: buildErrorMetadata(url) };
    }
}

/** Build a fully-formed signed proxy URL, or undefined if no source URL */
function buildSignedProxyUrl(
    imageUrl: string | undefined,
    secret: string,
): string | undefined {
    if (!imageUrl) return undefined;
    const params = createSignedParams(imageUrl, secret);
    return `${FUNCTIONS_BASE_URL}/proxyImage?url=${encodeURIComponent(imageUrl)}&${params}`;
}

/** Build error metadata for a URL that could not be fetched */
function buildErrorMetadata(url: string): Record<string, unknown> {
    return {
        url,
        domain: extractDomain(url),
        fetchedAt: Date.now(),
        error: true,
    };
}

/**
 * Cloud Function entry point.
 * POST /fetchLinkMeta { url: string }
 * Requires Firebase Auth token in Authorization header.
 */
export const fetchLinkMeta = onRequest(
    { cors: ALLOWED_ORIGINS, maxInstances: 10, secrets: [urlSigningSecret] },
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

        const secret = urlSigningSecret.value();
        const result = await handleFetchLinkMeta(
            req.body as FetchLinkMetaRequest,
            uid,
            secret || undefined,
        );
        res.status(result.status).json(result.data);
    },
);
