/**
 * SummarizeEntries — Background orchestrator for auto-summarization
 * Checks each entry against threshold, generates summary, updates Firestore + store
 * Observable: callers receive lifecycle events for UI feedback.
 */
import type { KnowledgeBankEntry, SummaryEntryResult } from '../types/knowledgeBank';
import { shouldSummarize, summarizeContent } from './summarizationService';

/** Lifecycle callbacks for summarization progress tracking */
export interface SummarizeCallbacks {
    /** Called once with all entry IDs that will be summarized */
    onStart?: (entryIds: string[]) => void;
    /** Called per-entry after summary is persisted to store */
    onEntryDone?: (entryId: string, summary: string) => void;
    /** Called once when all entries have been processed */
    onComplete?: (results: Record<string, SummaryEntryResult>) => void;
}

/**
 * Summarize any newly added entries that exceed the threshold.
 * Persists to Firestore first, then calls onEntryDone on success.
 * Non-blocking: catches all errors internally.
 */
export async function summarizeEntries(
    userId: string,
    workspaceId: string,
    entries: KnowledgeBankEntry[],
    callbacks?: SummarizeCallbacks
): Promise<void> {
    const toSummarize = entries.filter((e) => shouldSummarize(e.content));
    if (toSummarize.length === 0) return;

    const entryIds = toSummarize.map((e) => e.id);
    callbacks?.onStart?.(entryIds);

    const results: Record<string, SummaryEntryResult> = {};

    const tasks = toSummarize.map((entry) =>
        summarizeSingleEntry(userId, workspaceId, entry, callbacks, results)
    );
    await Promise.allSettled(tasks);

    callbacks?.onComplete?.(results);
}

/** Summarize one entry and persist the result */
async function summarizeSingleEntry(
    userId: string,
    workspaceId: string,
    entry: KnowledgeBankEntry,
    callbacks?: SummarizeCallbacks,
    results?: Record<string, SummaryEntryResult>
): Promise<void> {
    try {
        const summary = await summarizeContent(entry.content);
        if (!summary) {
            if (results) results[entry.id] = 'skipped';
            return;
        }

        // Persist to Firestore FIRST — ensures data consistency on failure
        const { updateKBEntry } = await import('./knowledgeBankService');
        await updateKBEntry(userId, workspaceId, entry.id, { summary });

        // Update store only after successful persistence
        callbacks?.onEntryDone?.(entry.id, summary);
        if (results) results[entry.id] = 'success';
    } catch {
        if (results) results[entry.id] = 'failed';
    }
}
