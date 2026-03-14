/**
 * useSidePanelQuoteActions — Quote actions for ReaderSidePanel.
 * Only "Create Node from Quote" is supported (no editor in side panel).
 */
import { useCallback } from 'react';
import type { ReaderSource } from '../types/reader';
import { createNodeFromQuote } from '../services/createNodeFromQuoteService';

export function useSidePanelQuoteActions(source: ReaderSource) {
    return useCallback((text: string, page?: number) => {
        createNodeFromQuote(source, text, page, '');
    }, [source]);
}
