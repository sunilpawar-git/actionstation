/**
 * RelevanceScorer — Keyword + TF-IDF relevance scoring
 * Ranks KB entries by similarity to the user prompt for smart context injection.
 * Combines field-weighted keyword matching with TF-IDF rare-term boosting.
 * Pure functions, no side effects, no API calls.
 */
import { buildCorpusIDF, tfidfScore } from './tfidfScorer';
import { entryToText as sharedEntryToText } from '@/shared/utils/textBuilders';

/** Common English stop words excluded from scoring */
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
    'been', 'has', 'had', 'do', 'did', 'not', 'no', 'can', 'will', 'just',
    'so', 'than', 'too', 'very', 'that', 'this', 'its', 'if', 'then',
    'into', 'also', 'about', 'up', 'out', 'what', 'which', 'who', 'how',
    'when', 'where', 'why', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'only', 'own', 'same', 'my', 'your',
    'his', 'her', 'our', 'they', 'them', 'their', 'me', 'him', 'she', 'he',
    'we', 'you',
]);

/** Minimum word length to keep after tokenization */
const MIN_TOKEN_LENGTH = 3;

/** Weight multiplier for title matches vs content matches */
const TITLE_WEIGHT = 3;

/** Weight for content/summary matches */
const CONTENT_WEIGHT = 1;

/** Weight for tag matches (between title and content) */
const TAG_WEIGHT = 2;

/**
 * Tokenize a string into lowercase keyword tokens, preserving duplicates.
 * Used by TF-IDF where term frequency (count) matters.
 * Removes punctuation, stop words, and short words.
 */
export function tokenizeRaw(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(w));
}

/**
 * Tokenize a string into deduplicated lowercase keyword tokens.
 * Used by keyword scoring where presence (not count) matters.
 * Removes punctuation, stop words, and short words.
 */
export function tokenize(text: string): string[] {
    return [...new Set(tokenizeRaw(text))];
}

/** Shape of an entry accepted by the scorer */
interface ScoredEntryInput {
    readonly title: string;
    readonly content: string;
    readonly summary?: string;
    readonly tags?: readonly string[];
}

/**
 * Score a single entry against a list of keyword tokens.
 * Title matches are weighted highest, then tags, then content/summary.
 * Checks all fields for the most accurate relevance.
 */
export function scoreEntry(
    entry: ScoredEntryInput,
    keywords: readonly string[]
): number {
    if (keywords.length === 0) return 0;

    const titleTokens = new Set(tokenize(entry.title));
    const contentTokens = new Set(tokenize(entry.content));
    const summaryTokens = entry.summary
        ? new Set(tokenize(entry.summary))
        : null;
    const tagTokens = entry.tags?.length
        ? new Set(tokenize(entry.tags.join(' ')))
        : null;

    let score = 0;
    for (const kw of keywords) {
        if (titleTokens.has(kw)) score += TITLE_WEIGHT;
        if (tagTokens?.has(kw)) score += TAG_WEIGHT;
        if (contentTokens.has(kw)) score += CONTENT_WEIGHT;
        if (summaryTokens?.has(kw)) score += CONTENT_WEIGHT;
    }
    return score;
}


/**
 * Rank entries by relevance to a prompt string.
 * Combines field-weighted keyword scoring with TF-IDF rare-term boosting.
 * Returns a new array sorted by descending relevance.
 * Entries with equal scores retain their original order (stable sort).
 * If prompt is empty or has no meaningful keywords, original order is preserved.
 */
export function rankEntries<T extends ScoredEntryInput>(
    entries: readonly T[],
    prompt: string
): T[] {
    const keywords = tokenize(prompt);
    if (keywords.length === 0) return [...entries];

    // Build TF-IDF corpus preserving duplicates (term frequency matters)
    const corpus = entries.map((e) => tokenizeRaw(sharedEntryToText(e)));
    const idfMap = buildCorpusIDF(corpus);

    const scored = entries.map((entry, index) => {
        const keywordScore = scoreEntry(entry, keywords);
        const tfidf = tfidfScore(corpus[index] ?? [], keywords, idfMap);
        return { entry, score: keywordScore + tfidf, index };
    });

    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index; // stable: preserve original order for ties
    });

    return scored.map((s) => s.entry);
}
