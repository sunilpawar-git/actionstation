/**
 * Security Constants - Centralized limits, messages, and allowed values
 * SSOT for all security-related configuration in Cloud Functions
 */

/** Allowed URL schemes for link preview fetching */
export const ALLOWED_SCHEMES = ['http:', 'https:'] as const;

/** Maximum URL length to prevent abuse */
export const MAX_URL_LENGTH = 2048;

/** Maximum HTML response size in bytes (1 MB) */
export const MAX_HTML_SIZE_BYTES = 1_048_576;

/** Maximum image response size in bytes (5 MB) */
export const MAX_IMAGE_SIZE_BYTES = 5_242_880;

/** Fetch timeout for external requests in milliseconds */
export const FETCH_TIMEOUT_MS = 5000;

/** Fetch timeout for Gemini API calls — LLM inference needs more headroom */
export const GEMINI_FETCH_TIMEOUT_MS = 30_000;

/** Rate limit: max metadata requests per window per user */
export const META_RATE_LIMIT = 20;

/** Rate limit: max image proxy requests per window per user */
export const IMAGE_RATE_LIMIT = 30;

/** Rate limit window duration in milliseconds (1 minute) */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Image proxy browser cache duration in seconds (24 hours) */
export const IMAGE_CACHE_MAX_AGE_SECONDS = 86_400;

/**
 * Allowed image MIME types for the proxy.
 * SVG is intentionally excluded — it can contain scripts/event handlers (XSS vector).
 */
export const ALLOWED_IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
] as const;

/** Rate limit: max Gemini proxy requests per window per user */
export const GEMINI_RATE_LIMIT = 60;

/** Maximum request body size for Gemini proxy (100 KB) */
export const GEMINI_MAX_BODY_BYTES = 102_400;

/** Maximum output tokens the client may request */
export const GEMINI_MAX_OUTPUT_TOKENS = 2048;

/** Gemini API base URL */
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Default Gemini model */
export const GEMINI_MODEL = 'gemini-2.0-flash';

/** Error messages returned to clients */
export const errorMessages = {
    authRequired: 'Authentication required',
    invalidUrl: 'Invalid or missing URL',
    urlTooLong: 'URL exceeds maximum length',
    unsupportedScheme: 'Only HTTP and HTTPS URLs are allowed',
    ssrfBlocked: 'URL target is not allowed',
    rateLimited: 'Rate limit exceeded. Try again later.',
    fetchFailed: 'Failed to fetch the target URL',
    responseTooLarge: 'Response exceeds size limit',
    invalidContentType: 'Response is not a valid image type',
    methodNotAllowed: 'Method not allowed',
    geminiKeyMissing: 'Gemini API key is not configured on the server',
    geminiInvalidBody: 'Invalid request body: contents array is required',
    geminiBodyTooLarge: 'Request body exceeds maximum size',
    geminiUpstreamError: 'Gemini API returned an error',
} as const;
