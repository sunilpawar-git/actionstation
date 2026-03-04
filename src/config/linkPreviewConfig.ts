/**
 * Link Preview Config - Cloud Function URL configuration
 * SSOT for all link preview proxy endpoint URLs
 */

/** Base URL for Cloud Functions (from environment variable) */
const CLOUD_FUNCTIONS_URL = (import.meta.env.VITE_CLOUD_FUNCTIONS_URL ?? '').trim();

/** Endpoint for fetching link metadata via server proxy */
export function getFetchLinkMetaUrl(): string {
    return `${CLOUD_FUNCTIONS_URL}/fetchLinkMeta`;
}

/**
 * Endpoint for proxying images via server.
 * Includes auth token as query param because <img> tags cannot send headers.
 */
export function getProxyImageUrl(imageUrl: string, token?: string): string {
    if (!imageUrl) return '';
    const base = `${CLOUD_FUNCTIONS_URL}/proxyImage?url=${encodeURIComponent(imageUrl)}`;
    return token ? `${base}&token=${encodeURIComponent(token)}` : base;
}

/** Check if Cloud Functions URL is configured */
export function isProxyConfigured(): boolean {
    return CLOUD_FUNCTIONS_URL.length > 0;
}
