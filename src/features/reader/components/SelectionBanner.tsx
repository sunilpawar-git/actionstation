/**
 * SelectionBanner — Shows selected text preview with BASB capture actions.
 * "Add to Note" inserts quote into current node's editor.
 * "Create Node" spawns a new IdeaCard with the quote as content.
 */
import React, { useCallback } from 'react';
import { strings } from '@/shared/localization/strings';

interface SelectionBannerProps {
    text: string;
    page?: number;
    onAddToNote?: (text: string, page?: number) => void;
    onCreateNode?: (text: string, page?: number) => void;
}

const MAX_PREVIEW_LEN = 120;

export const SelectionBanner = React.memo(function SelectionBanner({
    text,
    page,
    onAddToNote,
    onCreateNode,
}: SelectionBannerProps) {
    const preview = text.length > MAX_PREVIEW_LEN ? `${text.slice(0, MAX_PREVIEW_LEN)}…` : text;

    const handleAddToNote = useCallback(() => {
        onAddToNote?.(text, page);
    }, [text, page, onAddToNote]);

    const handleCreateNode = useCallback(() => {
        onCreateNode?.(text, page);
    }, [text, page, onCreateNode]);

    return (
        <div className="mb-3 p-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-xs"
            role="status" aria-label={strings.reader.selectionActions}>
            <p className="text-[var(--color-text-muted)] italic mb-1.5 line-clamp-2">{`"${preview}"`}</p>
            <div className="flex gap-2" role="group" aria-label={strings.reader.selectionActions}>
                <button
                    type="button"
                    onClick={handleAddToNote}
                    className="px-2 py-0.5 rounded bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)]"
                    aria-label={strings.reader.addToNote}
                >
                    {strings.reader.addToNote}
                </button>
                <button
                    type="button"
                    onClick={handleCreateNode}
                    className="px-2 py-0.5 rounded bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)]"
                    aria-label={strings.reader.createNodeFromQuote}
                >
                    {strings.reader.createNodeFromQuote}
                </button>
            </div>
        </div>
    );
});
