/**
 * Fuzzy Match — Unit Tests
 */
import { describe, it, expect } from 'vitest';
import { fuzzyMatch, splitByRanges, extractSnippet } from '../fuzzyMatch';

describe('fuzzyMatch', () => {
    it('exact match returns score 1.0', () => {
        const r = fuzzyMatch('React', 'React hooks');
        expect(r.matches).toBe(true);
        expect(r.score).toBe(1.0);
    });

    it('subsequence match returns score < 1.0', () => {
        const r = fuzzyMatch('rct', 'React');
        expect(r.matches).toBe(true);
        expect(r.score).toBeGreaterThan(0);
        expect(r.score).toBeLessThan(1.0);
    });

    it('no match returns matches: false', () => {
        const r = fuzzyMatch('xyz', 'React');
        expect(r.matches).toBe(false);
        expect(r.score).toBe(0);
        expect(r.ranges).toHaveLength(0);
    });

    it('case insensitive matching', () => {
        const r = fuzzyMatch('react', 'REACT HOOKS');
        expect(r.matches).toBe(true);
        expect(r.score).toBe(1.0);
    });

    it('consecutive characters get bonus (higher score than scattered)', () => {
        const consecutive = fuzzyMatch('rea', 'React hooks');
        const scattered = fuzzyMatch('reh', 'React hooks');
        expect(consecutive.score).toBeGreaterThan(scattered.score);
    });

    it('empty query returns no match', () => {
        const r = fuzzyMatch('', 'React');
        expect(r.matches).toBe(false);
    });

    it('query exceeding MAX_QUERY_LENGTH returns no match (security)', () => {
        const longQuery = 'a'.repeat(201);
        const r = fuzzyMatch(longQuery, 'React');
        expect(r.matches).toBe(false);
    });

    it('"brnstorm" fuzzy-matches "brainstorm" (subsequence)', () => {
        const r = fuzzyMatch('brnstorm', 'brainstorm');
        expect(r.matches).toBe(true);
    });

    it('"brainstrom" (transposition) does not match "brainstorm" as subsequence', () => {
        // Transpositions are NOT valid subsequences — this is expected behavior.
        // A future edit-distance matcher would handle this; fuzzyMatch is subsequence-only.
        const r = fuzzyMatch('brainstrom', 'brainstorm');
        expect(r.matches).toBe(false);
    });

    it('very scattered subsequence rejected (density < 0.3)', () => {
        // "react" scattered across "typescript adds types to javascript" (span ~29 chars)
        const r = fuzzyMatch('react', 'TypeScript adds types to JavaScript');
        expect(r.matches).toBe(false);
    });
});

describe('splitByRanges', () => {
    it('produces correct segments for single range', () => {
        const segs = splitByRanges('hello world', [{ start: 0, end: 5 }]);
        expect(segs).toEqual([
            { text: 'hello', highlighted: true },
            { text: ' world', highlighted: false },
        ]);
    });

    it('handles no ranges (full text, not highlighted)', () => {
        const segs = splitByRanges('hello', []);
        expect(segs).toEqual([{ text: 'hello', highlighted: false }]);
    });

    it('handles multiple ranges', () => {
        const segs = splitByRanges('abcdef', [{ start: 0, end: 2 }, { start: 4, end: 6 }]);
        expect(segs).toEqual([
            { text: 'ab', highlighted: true },
            { text: 'cd', highlighted: false },
            { text: 'ef', highlighted: true },
        ]);
    });

    it('handles adjacent ranges (merged into one highlight)', () => {
        const segs = splitByRanges('abcd', [{ start: 0, end: 2 }, { start: 2, end: 4 }]);
        // Adjacent ranges merge: {0,2} + {2,4} → {0,4}
        expect(segs).toHaveLength(1);
        expect(segs[0]).toEqual({ text: 'abcd', highlighted: true });
    });

    it('handles range at start of text', () => {
        const segs = splitByRanges('hello', [{ start: 0, end: 3 }]);
        expect(segs[0]).toEqual({ text: 'hel', highlighted: true });
    });

    it('handles range at end of text', () => {
        const segs = splitByRanges('hello', [{ start: 3, end: 5 }]);
        expect(segs[segs.length - 1]).toEqual({ text: 'lo', highlighted: true });
    });

    it('defensively sorts unsorted input ranges', () => {
        const segs = splitByRanges('abcdef', [{ start: 4, end: 6 }, { start: 0, end: 2 }]);
        expect(segs[0]).toEqual({ text: 'ab', highlighted: true });
    });

    it('merges overlapping ranges into one highlight', () => {
        const segs = splitByRanges('abcdef', [{ start: 0, end: 3 }, { start: 2, end: 5 }]);
        expect(segs[0]).toEqual({ text: 'abcde', highlighted: true });
    });
});

describe('extractSnippet', () => {
    const longText = `${'a'.repeat(50)}MATCH${'b'.repeat(50)}`;
    const ranges = [{ start: 50, end: 55 }];

    it('returns windowed context around first match', () => {
        const snippet = extractSnippet(longText, ranges, 10);
        expect(snippet).toContain('MATCH');
        expect(snippet.length).toBeLessThan(longText.length);
    });

    it('prefixes/suffixes "…" when text is truncated', () => {
        const snippet = extractSnippet(longText, ranges, 10);
        expect(snippet.startsWith('…')).toBe(true);
        expect(snippet.endsWith('…')).toBe(true);
    });

    it('returns full text when shorter than 2×contextChars', () => {
        const short = 'hello';
        expect(extractSnippet(short, [{ start: 0, end: 3 }], 40)).toBe(short);
    });

    it('handles match at start (no leading "…")', () => {
        const text = `MATCH${'b'.repeat(100)}`;
        const snippet = extractSnippet(text, [{ start: 0, end: 5 }], 10);
        expect(snippet.startsWith('…')).toBe(false);
    });

    it('handles match at end (no trailing "…")', () => {
        const text = `${'a'.repeat(100)}MATCH`;
        const snippet = extractSnippet(text, [{ start: 100, end: 105 }], 10);
        expect(snippet.endsWith('…')).toBe(false);
    });
});
