/**
 * OfflineFallback - Full-page fallback shown when offline with no cached data
 * Probes both IDB cache (via prop) and SW Cache API for offline data awareness.
 * All text from strings.offlineFallback.* -- no hardcoded strings.
 */
import { useState, useEffect } from 'react';
import { swCacheService } from '@/shared/services/swCacheService';
import { strings } from '@/shared/localization/strings';

const FIRESTORE_CACHE_PROBE_URL = 'https://firestore.googleapis.com';

interface OfflineFallbackProps {
    /** Whether any cached workspace data exists (from IDB/memory) */
    hasOfflineData: boolean;
    /** Called when user clicks retry */
    onRetry: () => void;
}

/** Full-page offline fallback that probes IDB and SW Cache API to show contextual messaging. */
export function OfflineFallback({ hasOfflineData, onRetry }: OfflineFallbackProps) {
    const [hasSwCache, setHasSwCache] = useState(false);

    // Probe SW Cache API for cached Firestore responses
    useEffect(() => {
        void swCacheService.getFromCache(
            FIRESTORE_CACHE_PROBE_URL, 'firestore-api'
        ).then((cached) => {
            if (cached) setHasSwCache(true);
        });
    }, []);

    const hasCachedData = hasOfflineData || hasSwCache;

    const title = hasCachedData
        ? strings.offlineFallback.title
        : strings.offlineFallback.noDataTitle;

    const message = hasCachedData
        ? strings.offlineFallback.message
        : strings.offlineFallback.noDataMessage;

    return (
        <div className="flex items-center justify-center min-h-[60vh] p-[var(--space-xl)]" role="alert">
            <div className="flex flex-col items-center text-center max-w-[400px]" style={{ gap: 16 }}>
                <div className="text-[var(--color-text-muted)]" style={{ marginBottom: 8 }} aria-hidden="true">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                        <line x1="12" y1="20" x2="12.01" y2="20" />
                    </svg>
                </div>
                <h2 className="font-semibold text-[var(--color-text-primary)] m-0" style={{ fontSize: 'var(--font-size-xl)' }}>{title}</h2>
                <p className="text-[var(--color-text-secondary)] leading-[var(--line-height-relaxed)] m-0" style={{ fontSize: 'var(--font-size-sm)' }}>{message}</p>
                <button className="text-[var(--header-text)] border-none rounded-md font-medium cursor-pointer transition-colors duration-150 ease-in-out" style={{ background: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', padding: '8px 24px', marginTop: 8 }} onClick={onRetry}>
                    {strings.offlineFallback.retryButton}
                </button>
            </div>
        </div>
    );
}
