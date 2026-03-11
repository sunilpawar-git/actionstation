/**
 * useLinkPreviewFetch - Debounced link preview fetcher
 * Detects new URLs, checks cache, fetches missing, updates canvasStore
 */
import { useEffect, useMemo, useRef } from 'react';
import { useCanvasStore, getNodeMap } from '../stores/canvasStore';
import { fetchLinkPreview } from '../services/linkPreviewService';
import { getFromCache, setInCache } from '../services/linkPreviewCache';
import { captureError } from '@/shared/services/sentryService';

/** Debounce delay before fetching (ms) */
const DEBOUNCE_MS = 500;

/** Max simultaneous Cloud Function calls per URL batch */
const CONCURRENCY_LIMIT = 3;

/**
 * Hook that fetches link previews for detected URLs in a node's content.
 * - Checks store first (already rendered), then cache, then network
 * - Debounces to avoid fetching on every keystroke
 * - Aborts in-flight requests on unmount or URL change
 */
export function useLinkPreviewFetch(nodeId: string, urls: string[]): void {
    const abortRef = useRef<AbortController | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Stabilize the urls reference: only change when the sorted set actually differs
    const stableUrlKey = useMemo(() => [...urls].sort().join('\n'), [urls]);
    const stableUrls = useMemo(() => urls, [stableUrlKey]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        // Clear previous debounce timer
        if (timerRef.current) clearTimeout(timerRef.current);

        if (stableUrls.length === 0) {
            // Prune immediately when all URLs removed (no debounce needed)
            pruneStalePreviewsFor(nodeId, stableUrls);
            return;
        }

        timerRef.current = setTimeout(() => {
            // Prune stale previews INSIDE debounce to avoid synchronous store
            // updates during the React commit phase (causes cascading re-renders)
            pruneStalePreviewsFor(nodeId, stableUrls);

            // Abort any previous in-flight requests
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            void processUrls(nodeId, stableUrls, controller.signal).catch((e: unknown) => {
                if (e instanceof DOMException && e.name === 'AbortError') return;
                captureError(e);
            });
        }, DEBOUNCE_MS);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            abortRef.current?.abort();
        };
    }, [nodeId, stableUrls]);
}

/** Remove stored link previews whose URL keys no longer appear in detected URLs */
function pruneStalePreviewsFor(nodeId: string, currentUrls: string[]): void {
    const store = useCanvasStore.getState();
    const node = getNodeMap(store.nodes).get(nodeId);
    const existing = node?.data.linkPreviews;
    if (!existing) return;

    const currentSet = new Set(currentUrls);
    for (const storedUrl of Object.keys(existing)) {
        if (!currentSet.has(storedUrl)) {
            useCanvasStore.getState().removeLinkPreview(nodeId, storedUrl);
        }
    }
}

/** Process a batch of URLs: skip known, use cache, fetch rest */
async function processUrls(
    nodeId: string,
    urls: string[],
    signal: AbortSignal,
): Promise<void> {
    const store = useCanvasStore.getState();
    const node = getNodeMap(store.nodes).get(nodeId);
    const existing = node?.data.linkPreviews ?? {};

    const toFetch = urls.filter((url) => !existing[url] || existing[url].error);
    if (toFetch.length === 0) return;

    // Process URLs in bounded batches to prevent spiking the Cloud Function
    // with O(n) simultaneous requests when a node contains many URLs.
    for (let i = 0; i < toFetch.length; i += CONCURRENCY_LIMIT) {
        if (signal.aborted) return;
        const batch = toFetch.slice(i, i + CONCURRENCY_LIMIT);
        await Promise.allSettled(batch.map(async (url) => {
            if (signal.aborted) return;

            // Check cache first (skip cached errors — allow re-fetch)
            const cached = getFromCache(url);
            if (cached && !cached.error) {
                useCanvasStore.getState().addLinkPreview(nodeId, url, cached);
                return;
            }

            // Fetch from network
            const metadata = await fetchLinkPreview(url, signal);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (signal.aborted) return;

            setInCache(url, metadata);
            useCanvasStore.getState().addLinkPreview(nodeId, url, metadata);
        }));
    }
}
