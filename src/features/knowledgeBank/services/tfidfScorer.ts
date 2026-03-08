/**
 * TF-IDF Scorer — Pure math functions for term frequency–inverse document frequency
 * Single responsibility: TF-IDF computation only.
 * Reuses tokenize() from relevanceScorer.ts as SSOT for tokenization.
 */

/**
 * Compute term frequency: ratio of term occurrences to total tokens.
 * TF(t, d) = count(t in d) / |d|
 */
export function computeTF(tokens: readonly string[], term: string): number {
    if (tokens.length === 0) return 0;
    const count = tokens.filter((t) => t === term).length;
    return count / tokens.length;
}

/**
 * Compute inverse document frequency using log-smoothed formula.
 * IDF(t) = log(totalDocs / (1 + docFrequency))
 * Returns 0 when term appears in all docs (no discriminative power).
 */
export function computeIDF(totalDocs: number, docFrequency: number): number {
    if (totalDocs === 0) return 0;
    if (docFrequency >= totalDocs) return 0;
    return Math.log(totalDocs / (1 + docFrequency));
}

/**
 * Build an IDF map from a corpus of tokenized documents.
 * Each document is an array of tokens (already tokenized via tokenize()).
 * Returns Map<term, idfValue>.
 */
export function buildCorpusIDF(corpus: ReadonlyArray<readonly string[]>): Map<string, number> {
    const totalDocs = corpus.length;
    if (totalDocs === 0) return new Map();

    // Count how many documents contain each term
    const docFrequency = new Map<string, number>();
    for (const doc of corpus) {
        const uniqueTerms = new Set(doc);
        for (const term of uniqueTerms) {
            docFrequency.set(term, (docFrequency.get(term) ?? 0) + 1);
        }
    }

    // Compute IDF for each term
    const idfMap = new Map<string, number>();
    for (const [term, freq] of docFrequency) {
        idfMap.set(term, computeIDF(totalDocs, freq));
    }
    return idfMap;
}

/**
 * Compute TF-IDF score for a document against a query.
 * Score = sum of TF(term, doc) * IDF(term) for each query term present in doc.
 */
export function tfidfScore(
    docTokens: readonly string[],
    queryTokens: readonly string[],
    idfMap: ReadonlyMap<string, number>
): number {
    if (docTokens.length === 0 || queryTokens.length === 0) return 0;

    let score = 0;
    const docSet = new Set(docTokens);
    for (const term of queryTokens) {
        if (!docSet.has(term)) continue;
        const tf = computeTF(docTokens, term);
        const idf = idfMap.get(term) ?? 0;
        score += tf * idf;
    }
    return score;
}

/**
 * Build a TF-IDF vector for a document against a corpus IDF map.
 * Returns Map<term, tf*idf> for cosine similarity computation.
 * SSOT: All TF-IDF vector math lives in this file.
 */
export function buildTFIDFVector(
    tokens: readonly string[],
    idfMap: ReadonlyMap<string, number>,
): Map<string, number> {
    const vec = new Map<string, number>();
    const unique = new Set(tokens);
    for (const term of unique) {
        const tf = computeTF(tokens, term);
        const idf = idfMap.get(term) ?? 0;
        if (tf > 0 && idf > 0) vec.set(term, tf * idf);
    }
    return vec;
}
