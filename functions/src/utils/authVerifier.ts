/**
 * Auth Verifier - Firebase ID token verification for Cloud Functions
 * In emulator: decodes JWT without cryptographic verification
 * In production: uses Firebase Admin SDK for full verification
 */
import { getAuth } from 'firebase-admin/auth';

/** Check if running in Firebase emulator (K_SERVICE is set by Cloud Functions runtime) */
function isEmulator(): boolean {
    return process.env.FUNCTIONS_EMULATOR === 'true' && !process.env.K_SERVICE;
}

/**
 * Verify Firebase ID token from Authorization header.
 * Returns the UID on success, null on failure.
 * In emulator mode, accepts any Bearer token (extracts uid from JWT payload).
 */
export async function verifyAuthToken(
    authHeader: string | undefined,
): Promise<string | null> {
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);

    if (isEmulator()) {
        return decodeTokenUid(token);
    }

    try {
        const decoded = await getAuth().verifyIdToken(token);
        return decoded.uid;
    } catch {
        return null;
    }
}

/** Extract UID from JWT payload without verification (emulator only) */
function decodeTokenUid(token: string): string | null {
    try {
        const parts = token.split('.');
        if (parts.length < 2 || !parts[1]) return null;
        const payload = JSON.parse(
            Buffer.from(parts[1], 'base64').toString(),
        ) as { user_id?: string; sub?: string };
        return payload.user_id ?? payload.sub ?? null;
    } catch {
        return null;
    }
}
