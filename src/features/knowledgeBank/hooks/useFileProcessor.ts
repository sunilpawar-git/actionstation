/**
 * useFileProcessor — Orchestrates file processing via parser infrastructure
 * Thin hook: validates → parses via registry → persists to KB → summarizes
 */
import { useCallback, useState } from 'react';
import { kbParserRegistry } from '../parsers/parserRegistry';
import { persistParseResult } from '../services/parseResultPersister';
import { parseWithPdfFallback } from '../services/pdfFallbackService';
import { runPostUploadSummarization } from '../services/postUploadSummarizer';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { captureError } from '@/shared/services/sentryService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { KB_MAX_FILE_SIZE } from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import { trackKbEntryAdded } from '@/shared/services/analyticsService';

export function useFileProcessor() {
    const [isProcessing, setIsProcessing] = useState(false);

    const processFile = useCallback(async (file: File) => {
        const userId = useAuthStore.getState().user?.id;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        if (file.size > KB_MAX_FILE_SIZE) {
            toast.error(strings.knowledgeBank.errors.fileTooLarge);
            return;
        }

        const parser = kbParserRegistry.getParser(file);
        if (!parser) {
            toast.error(strings.knowledgeBank.errors.unsupportedType);
            return;
        }

        setIsProcessing(true);
        try {
            const result = await parseWithPdfFallback(parser, file, () =>
                toast.info(strings.knowledgeBank.pdfScannedFallback));
            const entries = await persistParseResult(userId, workspaceId, result);
            for (const entry of entries) {
                useKnowledgeBankStore.getState().addEntry(entry);
            }
            entries.forEach(() => trackKbEntryAdded('file'));
            toast.success(result.metadata?.aiExtracted === 'true'
                ? strings.knowledgeBank.pdfExtracted
                : strings.knowledgeBank.saveEntry);

            void runPostUploadSummarization(userId, workspaceId, entries, {
                onStart: (entryIds) => {
                    useKnowledgeBankStore.getState().setSummarizingEntryIds(entryIds);
                },
                onEntryDone: (entryId, summary) => {
                    useKnowledgeBankStore.getState().updateEntry(entryId, { summary });
                    useKnowledgeBankStore.getState().removeSummarizingEntryId(entryId);
                },
                onComplete: () => {
                    useKnowledgeBankStore.getState().setSummarizingEntryIds([]);
                },
            }).catch((e: unknown) => captureError(e as Error));
        } catch (error) {
            // Only known ParserErrors (always localised) surface to the user; everything else uses uploadFailed.
            const msg = error instanceof Error && 'code' in error
                ? error.message
                : strings.knowledgeBank.errors.uploadFailed;
            toast.error(msg);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    return { processFile, isProcessing };
}
