/** Similarity Service — TF-IDF cosine similarity + agglomerative clustering */
import { tokenizeRaw } from '@/features/knowledgeBank/services/relevanceScorer';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { ClusterGroup } from '../types/cluster';
import { stripHtmlTags } from '@/shared/utils/htmlUtils';
import { generateUUID } from '@/shared/utils/uuid';

const MAX_NODES = 500;
const DEFAULT_THRESHOLD = 0.15;
const DEFAULT_MIN_SIZE = 2;
const MAX_COLOR_INDEX = 8;

interface ClusterOptions {
    readonly minClusterSize?: number;
    readonly similarityThreshold?: number;
}

interface SimilarityResult {
    readonly clusters: ClusterGroup[];
    readonly unclustered: readonly string[];
}

function extractNodeText(node: CanvasNode): string {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const heading = node.data?.heading ?? '';
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const output = node.data?.output ?? '';
    return stripHtmlTags(`${heading} ${output}`).trim();
}

function buildTermFrequencyMap(tokens: readonly string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
    const len = tokens.length;
    const tf = new Map<string, number>();
    for (const [term, count] of counts) tf.set(term, count / len);
    return tf;
}

/**
 * Small-corpus-safe IDF: log(1 + N / (1 + df)).
 * The existing tfidfScorer.ts uses log(N / (1 + df)) which returns 0
 * when df >= 1 in a 2-doc corpus. The +1 inside the log guarantees
 * positive values for any corpus size.
 */
function buildClusterIDF(corpus: ReadonlyArray<readonly string[]>): Map<string, number> {
    const n = corpus.length;
    if (n === 0) return new Map();
    const df = new Map<string, number>();
    for (const doc of corpus) {
        for (const term of new Set(doc)) {
            df.set(term, (df.get(term) ?? 0) + 1);
        }
    }
    const idfMap = new Map<string, number>();
    for (const [term, freq] of df) {
        idfMap.set(term, Math.log(1 + n / (1 + freq)));
    }
    return idfMap;
}

export function buildTfIdfVector(
    tokens: readonly string[],
    idfMap: ReadonlyMap<string, number>,
): Map<string, number> {
    const tf = buildTermFrequencyMap(tokens);
    const vec = new Map<string, number>();
    for (const [term, tfVal] of tf) {
        const idf = idfMap.get(term) ?? 0;
        vec.set(term, tfVal * idf);
    }
    return vec;
}

export function cosineSimilarity(
    vecA: ReadonlyMap<string, number>,
    vecB: ReadonlyMap<string, number>,
): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (const [term, valA] of vecA) {
        magA += valA * valA;
        const valB = vecB.get(term) ?? 0;
        dot += valA * valB;
    }
    for (const valB of vecB.values()) magB += valB * valB;
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}

function agglomerativeClustering(
    simMatrix: number[][],
    nodeIds: string[],
    threshold: number,
    minSize: number,
): { groups: string[][]; unclustered: string[] } {
    const clusters: string[][] = nodeIds.map((id) => [id]);
    const indexMap = new Map(nodeIds.map((id, i) => [id, i]));

    while (clusters.length > 1) {
        let bestSim = -1;
        let bestI = 0;
        let bestJ = 1;

        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                const ci = clusters[i];
                const cj = clusters[j];
                if (!ci || !cj) continue;
                const sim = avgLinkage(ci, cj, simMatrix, indexMap);
                if (sim > bestSim) {
                    bestSim = sim;
                    bestI = i;
                    bestJ = j;
                }
            }
        }

        if (bestSim < threshold) break;
        const bestClusterI = clusters[bestI];
        const bestClusterJ = clusters[bestJ];
        if (!bestClusterI || !bestClusterJ) break;
        clusters[bestI] = [...bestClusterI, ...bestClusterJ];
        clusters.splice(bestJ, 1);
    }

    const groups = clusters.filter((c) => c.length >= minSize);
    const groupedIds = new Set(groups.flat());
    const unclustered = nodeIds.filter((id) => !groupedIds.has(id));
    return { groups, unclustered };
}

function avgLinkage(
    a: string[],
    b: string[],
    sim: number[][],
    idx: ReadonlyMap<string, number>,
): number {
    let total = 0;
    for (const ai of a) {
        const ia = idx.get(ai);
        if (ia === undefined) continue;
        const simRow = sim[ia];
        if (!simRow) continue;
        for (const bi of b) {
            const ib = idx.get(bi);
            if (ib === undefined) continue;
            total += simRow[ib] ?? 0;
        }
    }
    return total / (a.length * b.length);
}

export function computeClusters(
    nodes: readonly CanvasNode[],
    options?: ClusterOptions,
): SimilarityResult {
    const threshold = options?.similarityThreshold ?? DEFAULT_THRESHOLD;
    const minSize = options?.minClusterSize ?? DEFAULT_MIN_SIZE;

    const capped = nodes.slice(0, MAX_NODES);
    const excessIds = nodes.slice(MAX_NODES).map((n) => n.id);

    const nodeTexts = capped.map((n) => ({ id: n.id, text: extractNodeText(n) }));
    const nonEmpty = nodeTexts.filter((nt) => nt.text.length > 0);
    const emptyIds = nodeTexts.filter((nt) => nt.text.length === 0).map((nt) => nt.id);

    if (nonEmpty.length < minSize) {
        return { clusters: [], unclustered: [...nodes.map((n) => n.id)] };
    }

    const corpus = nonEmpty.map((nt) => tokenizeRaw(nt.text));
    const idfMap = buildClusterIDF(corpus);
    const vectors = corpus.map((tokens) => buildTfIdfVector(tokens, idfMap));

    const n = nonEmpty.length;
    const simMatrix: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (let i = 0; i < n; i++) {
        const rowI = simMatrix[i];
        if (!rowI) continue;
        rowI[i] = 1;
        for (let j = i + 1; j < n; j++) {
            const vecI = vectors[i];
            const vecJ = vectors[j];
            if (!vecI || !vecJ) continue;
            const s = cosineSimilarity(vecI, vecJ);
            rowI[j] = s;
            const rowJ = simMatrix[j];
            if (rowJ) rowJ[i] = s;
        }
    }

    const nodeIds = nonEmpty.map((nt) => nt.id);
    const { groups, unclustered } = agglomerativeClustering(simMatrix, nodeIds, threshold, minSize);

    const clusters: ClusterGroup[] = groups.map((group, index) => ({
        id: `cluster-${generateUUID()}`,
        nodeIds: group,
        label: `Cluster ${index + 1}`,
        colorIndex: index % MAX_COLOR_INDEX,
    }));

    return {
        clusters,
        unclustered: [...unclustered, ...emptyIds, ...excessIds],
    };
}
