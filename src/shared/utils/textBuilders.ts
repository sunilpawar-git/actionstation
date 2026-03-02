/**
 * Shared text building utilities for entries (nodes, KB entries, etc.)
 * Provides consistent text representation for tokenization and scoring.
 */

export interface TextBuildableEntry {
    readonly title: string;
    readonly content: string;
    readonly tags?: readonly string[];
    readonly summary?: string;
}

/**
 * Builds a single text string from an entry by combining title, summary,
 * content, and tags. Used for tokenization and relevance scoring.
 */
export function entryToText(entry: TextBuildableEntry): string {
    const parts = [entry.title, entry.content];
    if (entry.summary) parts.push(entry.summary);
    if (entry.tags?.length) parts.push(entry.tags.join(' '));
    return parts.join(' ');
}
