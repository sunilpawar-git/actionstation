/**
 * geminiProxy Cloud Function — Server-side Gemini API proxy
 * Hides the API key from client-side code (resolves S1 limitation)
 * Validates auth, enforces rate limits, caps output tokens, forwards to Gemini
 */
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { verifyAuthToken } from './utils/authVerifier.js';
import { checkRateLimit } from './utils/rateLimiter.js';
import { ALLOWED_ORIGINS } from './utils/corsConfig.js';
import {
    errorMessages,
    GEMINI_RATE_LIMIT,
    GEMINI_MAX_BODY_BYTES,
    GEMINI_MAX_OUTPUT_TOKENS,
    GEMINI_API_BASE,
    GEMINI_MODEL,
    GEMINI_FETCH_TIMEOUT_MS,
} from './utils/securityConstants.js';

/** Secret managed via Google Cloud Secret Manager */
const geminiApiKey = defineSecret('GEMINI_API_KEY');

/** Shape of the incoming request body from the client */
export interface GeminiProxyRequest {
    contents?: Array<{ parts?: Array<Record<string, unknown>> }>;
    generationConfig?: {
        temperature?: number;
        maxOutputTokens?: number;
    };
}

/** Result returned by the core handler */
export interface GeminiProxyResult {
    status: number;
    data: Record<string, unknown>;
}

/**
 * Core handler logic extracted for testability.
 * Validates the request, forwards to Gemini, returns the response.
 */
export async function handleGeminiProxy(
    body: GeminiProxyRequest,
    uid: string,
    apiKey: string,
): Promise<GeminiProxyResult> {
    // Validate API key is configured
    if (!apiKey) {
        return { status: 500, data: { error: errorMessages.geminiKeyMissing } };
    }

    // Rate limit
    if (!await checkRateLimit(uid, 'geminiProxy', GEMINI_RATE_LIMIT)) {
        return { status: 429, data: { error: errorMessages.rateLimited } };
    }

    // Validate request body
    if (!body.contents || !Array.isArray(body.contents) || body.contents.length === 0) {
        return { status: 400, data: { error: errorMessages.geminiInvalidBody } };
    }

    // Enforce body size (serialized JSON)
    const serialized = JSON.stringify(body);
    if (serialized.length > GEMINI_MAX_BODY_BYTES) {
        return { status: 400, data: { error: errorMessages.geminiBodyTooLarge } };
    }

    // Cap output tokens
    const sanitizedBody = capOutputTokens(body);

    // Forward to Gemini API
    const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), GEMINI_FETCH_TIMEOUT_MS);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sanitizedBody),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        const data = await response.json() as Record<string, unknown>;

        if (!response.ok) {
            return { status: response.status, data: { error: errorMessages.geminiUpstreamError, details: data } };
        }

        return { status: 200, data };
    } catch {
        return { status: 502, data: { error: errorMessages.geminiUpstreamError } };
    }
}

/** Cap maxOutputTokens to prevent excessive usage */
function capOutputTokens(body: GeminiProxyRequest): GeminiProxyRequest {
    const config = body.generationConfig;
    if (!config) return body;

    const capped = Math.min(config.maxOutputTokens ?? GEMINI_MAX_OUTPUT_TOKENS, GEMINI_MAX_OUTPUT_TOKENS);
    return {
        ...body,
        generationConfig: { ...config, maxOutputTokens: capped },
    };
}

/**
 * Cloud Function entry point.
 * POST /geminiProxy { contents, generationConfig }
 * Requires Firebase Auth token in Authorization header.
 */
export const geminiProxy = onRequest(
    { cors: ALLOWED_ORIGINS, maxInstances: 10, secrets: [geminiApiKey] },
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

        const result = await handleGeminiProxy(
            req.body as GeminiProxyRequest,
            uid,
            geminiApiKey.value(),
        );
        res.status(result.status).json(result.data);
    },
);
