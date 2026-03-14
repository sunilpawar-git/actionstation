/**
 * useOpenArticle — Extracts article content from a URL via Readability
 * and opens it in the reader. Used by FocusOverlay link preview cards.
 *
 * Aborts the previous in-flight request when a new URL is opened,
 * preventing stale articles from overwriting the current reader state.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useFocusStore } from '@/features/canvas/stores/focusStore';
import { extractArticleContent, buildArticleSource } from '../services/contentExtractor';
import { toSafeArticleUrl } from '../utils/safeUrl';

export function useOpenArticle(nodeId: string) {
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => { abortRef.current?.abort(); };
    }, []);

    return useCallback((url: string) => {
        const safeUrl = toSafeArticleUrl(url);
        if (!safeUrl) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        extractArticleContent(safeUrl, controller.signal).then((article) => {
            if (controller.signal.aborted || !article) return;
            const source = buildArticleSource(safeUrl, article);
            useFocusStore.getState().openReader(nodeId, source);
        }).catch(() => undefined);
    }, [nodeId]);
}
