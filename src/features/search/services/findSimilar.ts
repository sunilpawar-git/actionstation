/**
 * Find Similar — TF-IDF cosine similarity for node-to-node semantic search.
 * Pure functions with serializable I/O — safe to move to Web Worker when corpus > 1000 nodes.
 * Reuses tokenizeRaw (SSOT) and buildCorpusIDF + buildTFIDFVector from tfidfScorer (DRY).
 */
import { buildCorpusIDF, buildTFIDFVector } from '@/features/knowledgeBank/services/tfidfScorer';
import { tokenizeRaw } from '@/features/knowledgeBank/services/relevanceScorer';
import type { CanvasNode } from '@/features/canvas/types/node';

export interface SimilarResult {
    nodeId: string;
    similarity: number;
    heading: string;
}

const SIMILARITY_THRESHOLD = 0.15; // 0.1 surfaces too many loosely-related nodes

export function getNodeText(node: CanvasNode): string {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defense-in-depth: Firestore data may be undefined
    return [node.data?.heading, node.data?.output].filter(Boolean).join(' ');
}

export function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (const [term, score] of a) {
        dot += score * (b.get(term) ?? 0);
        magA += score * score;
    }
    for (const [, score] of b) magB += score * score;
    return magA > 0 && magB > 0 ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

export function findSimilarNodes(
    sourceNodeId: string,
    nodes: CanvasNode[],
    topN = 7,
    precomputedIDF?: ReadonlyMap<string, number>,
): SimilarResult[] {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return [];

    const sourceText = getNodeText(sourceNode);
    if (!sourceText.trim()) return [];

    // Build tokenized corpus (reuses SSOT tokenizeRaw)
    const corpus = nodes.map((n) => tokenizeRaw(getNodeText(n)));
    const idf = precomputedIDF ?? buildCorpusIDF(corpus); // Use cache when provided

    const sourceIdx = nodes.findIndex((n) => n.id === sourceNodeId);
    const sourceVec = buildTFIDFVector(corpus[sourceIdx] ?? [], idf);

    const results: SimilarResult[] = [];
    for (let i = 0; i < nodes.length; i++) {
        if (i === sourceIdx) continue;
        const candidate = nodes[i];
        if (!candidate) continue;
        const vec = buildTFIDFVector(corpus[i] ?? [], idf);
        const sim = cosineSimilarity(sourceVec, vec);
        if (sim > SIMILARITY_THRESHOLD) {
            results.push({
                nodeId: candidate.id,
                similarity: sim,
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defense-in-depth
                heading: candidate.data?.heading ?? '',
            });
        }
    }
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
}
