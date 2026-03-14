/**
 * Safe URL validation for the reader feature.
 * Single source of truth — all reader opens must pass through toSafeReaderUrl.
 * Accepts only https: URLs from trusted origins; rejects everything else.
 */
import type { SafeReaderUrl } from '../types/reader';

const TRUSTED_ORIGINS: ReadonlySet<string> = new Set([
    typeof window !== 'undefined' ? window.location.origin : '',
    'https://firebasestorage.googleapis.com',
    'https://storage.googleapis.com',
]);

/**
 * Validate and brand a raw URL string.
 * Returns SafeReaderUrl if valid, null otherwise.
 * Accepts https: from trusted origins only.
 */
export function toSafeReaderUrl(raw: string): SafeReaderUrl | null {
    if (!raw || typeof raw !== 'string') return null;

    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        return null;
    }

    if (parsed.protocol !== 'https:') return null;

    const originMatch = Array.from(TRUSTED_ORIGINS).some(
        (origin) => origin.length > 0 && parsed.origin === origin,
    );

    if (!originMatch) {
        const isFirebaseStorage =
            parsed.hostname.endsWith('.firebasestorage.googleapis.com') ||
            parsed.hostname.endsWith('.storage.googleapis.com');
        if (!isFirebaseStorage) return null;
    }

    return raw as SafeReaderUrl;
}

/** Check if a MIME type is a supported reader source */
export function isReaderSupportedMime(
    mime: string,
): mime is 'application/pdf' | `image/${string}` {
    return mime === 'application/pdf' || mime.startsWith('image/');
}

/**
 * Validate a URL for article extraction (less restrictive than toSafeReaderUrl).
 * Accepts any https URL since content is fetched and parsed by Readability,
 * never rendered directly in an iframe or embedded.
 */
export function toSafeArticleUrl(raw: string): SafeReaderUrl | null {
    if (!raw || typeof raw !== 'string') return null;

    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        return null;
    }

    if (parsed.protocol !== 'https:') return null;

    return raw as SafeReaderUrl;
}
