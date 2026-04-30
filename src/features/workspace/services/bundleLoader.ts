/**
 * Firestore Bundle Loader — loads pre-built workspace metadata bundles.
 * Falls back to normal Firestore queries if bundles are unavailable.
 */
import { loadBundle, namedQuery, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/config/firebase';
import { logger } from '@/shared/services/logger';

const BUNDLE_CACHE_KEY = 'workspace-bundle';
const BUNDLE_MAX_AGE_MS = 5 * 60 * 1000;

interface BundleResponse {
    bundle: string;
    queryName: string;
    maxAgeSeconds: number;
    docCount: number;
}

interface CachedBundle {
    data: string;
    timestamp: number;
}

function getCachedBundle(): CachedBundle | null {
    try {
        const cached = sessionStorage.getItem(BUNDLE_CACHE_KEY);
        if (!cached) return null;
        const parsed = JSON.parse(cached) as CachedBundle;
        if (Date.now() - parsed.timestamp > BUNDLE_MAX_AGE_MS) {
            sessionStorage.removeItem(BUNDLE_CACHE_KEY);
            return null;
        }
        return parsed;
    } catch (err) {
        logger.warn('[bundleLoader] Cached bundle corrupted, clearing', err);
        return null;
    }
}

/**
 * Load workspace metadata using Firestore Bundles.
 * Returns the named query snapshot if bundle is available and valid.
 * Returns null if bundle is unavailable (caller should fall back to normal queries).
 * Times out after 3 s so a cold Cloud Function never blocks the workspace list.
 */
export async function loadWorkspaceBundle(): Promise<ReturnType<typeof getDocs> | null> {
    const TIMEOUT_MS = 3000;
    try {
        const cached = getCachedBundle();
        let bundleData: string;

        if (cached) {
            bundleData = cached.data;
        } else {
            const callable = httpsCallable<undefined, BundleResponse>(functions, 'workspaceBundle');
            const result = await Promise.race([
                callable(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('bundle timeout')), TIMEOUT_MS)
                ),
            ]);
            bundleData = result.data.bundle;
            sessionStorage.setItem(BUNDLE_CACHE_KEY, JSON.stringify({
                data: bundleData,
                timestamp: Date.now(),
            }));
        }

        const bytes = Uint8Array.from(atob(bundleData), (c) => c.charCodeAt(0));
        await loadBundle(db, bytes);
        const q = await namedQuery(db, 'workspace-list');
        if (!q) return null;
        return await getDocs(q);
    } catch (err) {
        logger.warn('[bundleLoader] Bundle load failed, falling back to queries', err);
        return null;
    }
}

export function invalidateBundleCache(): void {
    sessionStorage.removeItem(BUNDLE_CACHE_KEY);
}
