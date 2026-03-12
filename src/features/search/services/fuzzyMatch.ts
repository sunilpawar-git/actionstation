/**
 * Fuzzy Match — Subsequence matcher + highlight segmenter + snippet extractor.
 * Pure functions, zero dependencies. Security: MAX_QUERY_LENGTH enforced.
 * Score 1.0 = exact substring; <1.0 = fuzzy subsequence; 0 = no match.
 */

export interface FuzzyResult {
    matches: boolean;
    score: number;
    ranges: ReadonlyArray<{ start: number; end: number }>;
}

export interface TextSegment {
    text: string;
    highlighted: boolean;
}

const MAX_QUERY_LENGTH = 200; // Security: prevent excessive computation

export function fuzzyMatch(query: string, text: string): FuzzyResult {
    if (!query || !text || query.length > MAX_QUERY_LENGTH) {
        return { matches: false, score: 0, ranges: [] };
    }
    const lq = query.toLowerCase();
    const lt = text.toLowerCase();

    // Exact substring = highest score
    const exactIdx = lt.indexOf(lq);
    if (exactIdx !== -1) {
        return { matches: true, score: 1.0, ranges: [{ start: exactIdx, end: exactIdx + lq.length }] };
    }

    // Subsequence match with consecutive bonus + density penalty
    let qi = 0;
    let score = 0;
    let lastMatchIdx = -2; // -2 so first match can't be "consecutive"
    let firstMatchIdx = -1;
    const ranges: Array<{ start: number; end: number }> = [];
    let rangeStart = -1;

    for (let ti = 0; ti < lt.length && qi < lq.length; ti++) {
        if (lt[ti] === lq[qi]) {
            if (firstMatchIdx === -1) firstMatchIdx = ti;
            if (rangeStart === -1) rangeStart = ti;
            score += 1;
            if (ti === lastMatchIdx + 1) score += 0.5; // consecutive bonus
            lastMatchIdx = ti;
            qi++;
        } else if (rangeStart !== -1) {
            ranges.push({ start: rangeStart, end: ti });
            rangeStart = -1;
        }
    }
    if (rangeStart !== -1 && qi > 0) {
        ranges.push({ start: rangeStart, end: lastMatchIdx + 1 });
    }

    const matched = qi === lq.length;
    if (!matched) return { matches: false, score: 0, ranges: [] };

    // Density: ratio of query length to match span. Penalises scattered matches.
    const matchSpan = lastMatchIdx - firstMatchIdx + 1;
    const density = lq.length / matchSpan; // 1.0 = perfectly consecutive, low = scattered
    if (density < 0.3) return { matches: false, score: 0, ranges: [] }; // Too scattered to be useful

    return {
        matches: true,
        score: Math.min((score * density) / (lq.length * 1.5), 0.99), // cap below 1.0 (exact only = 1.0)
        ranges,
    };
}

/**
 * Split text into highlighted/non-highlighted segments for safe React rendering.
 * Defensively sorts and merges overlapping ranges before processing.
 */
export function splitByRanges(
    text: string,
    ranges: ReadonlyArray<{ start: number; end: number }>,
): TextSegment[] {
    if (ranges.length === 0) return [{ text, highlighted: false }];
    // Defensive: sort and merge overlapping ranges
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [];
    for (const r of sorted) {
        const prev = merged[merged.length - 1];
        if (prev && r.start <= prev.end) {
            prev.end = Math.max(prev.end, r.end);
        } else {
            merged.push({ ...r });
        }
    }
    const segments: TextSegment[] = [];
    let cursor = 0;
    for (const { start, end } of merged) {
        if (start > cursor) segments.push({ text: text.slice(cursor, start), highlighted: false });
        segments.push({ text: text.slice(start, end), highlighted: true });
        cursor = end;
    }
    if (cursor < text.length) segments.push({ text: text.slice(cursor), highlighted: false });
    return segments;
}

const SNIPPET_CONTEXT_CHARS = 40;

/** Extract a windowed snippet around the first match range for compact result display. */
export function extractSnippet(
    text: string,
    ranges: ReadonlyArray<{ start: number; end: number }>,
    contextChars = SNIPPET_CONTEXT_CHARS,
): string {
    if (ranges.length === 0 || text.length <= contextChars * 2) return text;
    const first = ranges[0];
    if (!first) return text;
    const windowStart = Math.max(0, first.start - contextChars);
    const windowEnd = Math.min(text.length, first.end + contextChars);
    const prefix = windowStart > 0 ? '…' : '';
    const suffix = windowEnd < text.length ? '…' : '';
    return prefix + text.slice(windowStart, windowEnd) + suffix;
}
