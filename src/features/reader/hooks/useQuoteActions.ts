/**
 * useQuoteActions — Coordinates quote insertion (Add to Note)
 * and node creation (Create Node from Quote) from the reader.
 * Includes deduplication guard within active session.
 */
import { useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import type { ReaderSource } from '../types/reader';
import { insertQuoteIntoEditor } from '../services/quoteInsertionService';
import { selectionFingerprint } from '../services/quoteSanitizer';
import { createNodeFromQuote as createNodeService } from '../services/createNodeFromQuoteService';
import { trackReaderQuoteInserted } from '@/shared/services/analyticsService';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

interface UseQuoteActionsOptions {
    editor: Editor | null;
    source: ReaderSource;
    nodeId: string;
    sessionId: number;
}

export function useQuoteActions({ editor, source, nodeId, sessionId }: UseQuoteActionsOptions) {
    const insertedFingerprintsRef = useRef<Set<string>>(new Set());
    const prevSessionRef = useRef(sessionId);

    if (prevSessionRef.current !== sessionId) {
        prevSessionRef.current = sessionId;
        insertedFingerprintsRef.current = new Set();
    }

    const addToNote = useCallback((text: string, page?: number) => {
        if (!editor || editor.isDestroyed) return;

        const fp = selectionFingerprint(source.sourceId, page, text);
        if (insertedFingerprintsRef.current.has(fp)) return;

        const success = insertQuoteIntoEditor(editor, text, {
            sourceId: source.sourceId,
            sourceType: source.type,
            filename: source.filename,
            page,
            nodeId,
        });

        if (success) {
            insertedFingerprintsRef.current.add(fp);
            trackReaderQuoteInserted(source.type, 'add_to_note');
            toast.success(strings.reader.quoteAdded);
        }
    }, [editor, source, nodeId]);

    const handleCreateNode = useCallback((text: string, page?: number) => {
        createNodeService(source, text, page, nodeId);
    }, [source, nodeId]);

    return { addToNote, createNodeFromQuote: handleCreateNode };
}
