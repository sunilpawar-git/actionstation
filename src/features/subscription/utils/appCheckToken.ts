/**
 * App Check token helper for onRequest Cloud Function calls.
 * Firebase onCall handles App Check automatically; onRequest functions require
 * the client to send the X-Firebase-AppCheck header manually.
 *
 * Returns the token string on success, or null if App Check is unavailable.
 * Callers should include the token when present but not block the request if absent —
 * the Cloud Function enforces App Check server-side.
 */
import { getToken } from 'firebase/app-check';
import { appCheck } from '@/config/firebase';

export async function getAppCheckToken(): Promise<string | null> {
    try {
        const result = await getToken(appCheck, /* forceRefresh */ false);
        return result.token;
    } catch {
        return null;
    }
}
