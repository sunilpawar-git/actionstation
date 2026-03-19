/**
 * Post-Upload Summarizer — Orchestrates summarization after file upload
 * Step 1: Summarize individual chunks (existing summarizeEntries)
 * Step 2: For chunked docs, generate a document-level summary from raw content
 * Never throws — all errors are caught internally.
 */
import type { KnowledgeBankEntry } from '../types/knowledgeBank';
import type { SummarizeCallbacks } from './summarizeEntries';
import { summarizeEntries } from './summarizeEntries';
import { summarizeDocument } from './documentSummarizer';
import { logger } from '@/shared/services/logger';

/**
 * Run full summarization pipeline after upload.
 * For chunked documents, generates a document-level summary from raw chunk
 * contents (not summaries) and persists it on the parent entry.
 */
export async function runPostUploadSummarization(
    userId: string,
    workspaceId: string,
    entries: KnowledgeBankEntry[],
    callbacks?: SummarizeCallbacks
): Promise<void> {
    try {
        await summarizeEntries(userId, workspaceId, entries, callbacks);

        const parent = entries.find((e) => !e.parentEntryId);
        const children = entries.filter((e) => e.parentEntryId);

        if (!parent || children.length === 0) return;

        const { updateKBEntry } = await import('./knowledgeBankService');
        const allEntries = [parent, ...children];
        const chunkContents = allEntries.map((e) => e.content);
        const docSummary = await summarizeDocument(chunkContents, parent.title);

        if (docSummary) {
            await updateKBEntry(userId, workspaceId, parent.id, {
                summary: docSummary,
                documentSummaryStatus: 'ready',
            });
        } else {
            await updateKBEntry(userId, workspaceId, parent.id, {
                documentSummaryStatus: 'ready',
            });
        }
    } catch (error) {
        logger.warn('Post-upload summarization failed', error);
    }
}
