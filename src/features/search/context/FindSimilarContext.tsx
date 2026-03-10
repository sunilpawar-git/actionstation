/**
 * FindSimilarContext — Singleton provider for useFindSimilar.
 *
 * Fixes O(n²) performance bug: useFindSimilar was called inside IdeaCard,
 * causing buildCorpusIDF to run N times (once per node) on every nodes change.
 * Mounting it once here reduces this to O(n) — a single IDF rebuild per change.
 *
 * Usage:
 *   - Wrap the canvas with <FindSimilarProvider>
 *   - IdeaCard: const ctx = useFindSimilarContext();
 */
import { createContext, useContext, type ReactNode } from 'react';
import { useFindSimilar } from '../hooks/useFindSimilar';
import type { SimilarResult } from '../services/findSimilar';

type FindSimilarContextValue = ReturnType<typeof useFindSimilar>;

const FindSimilarContext = createContext<FindSimilarContextValue | null>(null);

/** Stable no-op fallback used when provider is absent (e.g. unit tests). */
const FALLBACK: FindSimilarContextValue = {
    results: [] as SimilarResult[],
    isActive: false,
    activeNodeId: null,
    isComputing: false,
    findSimilar: () => undefined,
    clearSimilar: () => undefined,
};

export function FindSimilarProvider({ children }: { readonly children: ReactNode }) {
    const value = useFindSimilar();
    return (
        <FindSimilarContext.Provider value={value}>
            {children}
        </FindSimilarContext.Provider>
    );
}

/**
 * Returns the shared FindSimilar context.
 * Falls back to a no-op value when used outside FindSimilarProvider (tests, Storybook).
 */
export function useFindSimilarContext(): FindSimilarContextValue {
    return useContext(FindSimilarContext) ?? FALLBACK;
}
