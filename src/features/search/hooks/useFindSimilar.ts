/**
 * useFindSimilar — On-demand TF-IDF cosine similarity hook.
 * NOT keystroke-driven. Triggered by button click / context menu.
 * Corpus IDF pre-computed and memoized keyed on `nodes`.
 * isComputing derived from useDeferredValue (no setState side-effect).
 */
import { useState, useCallback, useMemo, useDeferredValue } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { buildCorpusIDF } from '@/features/knowledgeBank/services/tfidfScorer';
import { tokenizeRaw } from '@/features/knowledgeBank/services/relevanceScorer';
import { findSimilarNodes, getNodeText, type SimilarResult } from '../services/findSimilar';

export function useFindSimilar() {
    const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);
    const nodes = useCanvasStore((s) => s.nodes);

    // Pre-compute and cache corpus IDF whenever nodes change.
    const cachedIDF = useMemo(() => {
        if (nodes.length === 0) return new Map<string, number>();
        const corpus = nodes.map((n) => tokenizeRaw(getNodeText(n)));
        return buildCorpusIDF(corpus);
    }, [nodes]);

    // useDeferredValue keeps UI responsive during O(n²) TF-IDF computation.
    const deferredSourceId = useDeferredValue(sourceNodeId);

    // isComputing: true in the window between user trigger and deferred computation
    const isComputing = sourceNodeId !== null && deferredSourceId !== sourceNodeId;

    const results: SimilarResult[] = useMemo(
        () => (deferredSourceId ? findSimilarNodes(deferredSourceId, nodes, 7, cachedIDF) : []),
        [deferredSourceId, nodes, cachedIDF],
    );

    const findSimilar = useCallback((nodeId: string) => setSourceNodeId(nodeId), []);
    const clearSimilar = useCallback(() => setSourceNodeId(null), []);

    return { results, isActive: sourceNodeId !== null, isComputing, findSimilar, clearSimilar };
}
