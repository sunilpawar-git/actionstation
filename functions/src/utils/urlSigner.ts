/**
 * URL Signer — Creates and verifies short-lived HMAC-signed proxy URLs
 * Eliminates the need to expose auth tokens in URL query parameters
 */
import * as crypto from 'crypto';

const SIGNED_URL_TTL_MS = 10 * 60 * 1000;

/**
 * Create signed query params for a proxy image URL.
 * Returns the `sig=...&exp=...` portion to append.
 */
export function createSignedParams(imageUrl: string, secret: string): string {
    const exp = Date.now() + SIGNED_URL_TTL_MS;
    const payload = `${imageUrl}:${exp}`;
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return `sig=${sig}&exp=${exp}`;
}

/**
 * Verify that the sig + exp params are valid for the given image URL.
 * Returns false if expired or tampered.
 */
export function verifySignedParams(
    imageUrl: string,
    sig: string,
    exp: string,
    secret: string,
): boolean {
    const expNum = parseInt(exp, 10);
    if (isNaN(expNum) || Date.now() > expNum) return false;
    const payload = `${imageUrl}:${exp}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (sig.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
