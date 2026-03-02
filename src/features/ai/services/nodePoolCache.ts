/**
 * NodePoolCache — Memoized TF-IDF corpus for node pool ranking
 * Caches corpus tokenization and IDF map so that only ranking
 * (which depends on the prompt) is recomputed per generation.
 * Cache key: hash of sorted entry IDs + content fingerprint.
 */
import { buildCorpusIDF, tfidfScore } from '@/features/knowledgeBank/services/tfidfScorer';
import { tokenize, tokenizeRaw, scoreEntry } from '@/features/knowledgeBank/services/relevanceScorer';
import { entryToText } from '@/shared/utils/textBuilders';
import type { NodePoolEntry } from '../types/nodePool';

interface CachedCorpus {
    corpus: string[][];
    idfMap: Map<string, number>;
}

/** FNV-1a 32-bit hash — fast, non-cryptographic content fingerprint */
function fnv1a(str: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;
    }
    return hash;
}

function buildCacheKey(entries: readonly NodePoolEntry[]): string {
    return entries.map((e) => `${e.id}:${fnv1a(e.content)}`).join('|');
}

/**
 * Caches TF-IDF corpus + IDF map, keyed by entry fingerprint.
 * Provides `rankEntries` that reuses the cached corpus for scoring.
 */
export class NodePoolCache {
    private cachedKey = '';
    private cached: CachedCorpus = { corpus: [], idfMap: new Map() };

    /** Get or rebuild the corpus data for the given entries */
    getCorpusData(entries: readonly NodePoolEntry[]): Readonly<CachedCorpus> {
        const key = buildCacheKey(entries);
        if (key === this.cachedKey) return this.cached;

        const corpus = entries.map((e) => tokenizeRaw(entryToText(e)));
        const idfMap = buildCorpusIDF(corpus);
        this.cached = { corpus, idfMap };
        this.cachedKey = key;
        return this.cached;
    }

    /**
     * Rank entries by relevance to a prompt using cached corpus + IDF.
     * Combines field-weighted keyword scoring with TF-IDF rare-term boosting.
     */
    rankEntries(entries: readonly NodePoolEntry[], prompt: string): NodePoolEntry[] {
        if (entries.length === 0) return [];

        const keywords = tokenize(prompt);
        if (keywords.length === 0) return [...entries];

        const { corpus, idfMap } = this.getCorpusData(entries);

        const scored = entries.map((entry, index) => {
            const keywordScore = scoreEntry(entry, keywords);
            const tfidf = tfidfScore(corpus[index] ?? [], keywords, idfMap);
            return { entry, score: keywordScore + tfidf, index };
        });

        scored.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.index - b.index;
        });

        return scored.map((s) => s.entry);
    }
}
