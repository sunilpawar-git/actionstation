/**
 * ArticleViewer — Renders extracted web article content with selectable text.
 * Content comes from @mozilla/readability extraction (no iframe needed).
 * Supports text selection for the quote-to-note pipeline.
 */
import React, { useCallback, useEffect } from 'react';
import { strings } from '@/shared/localization/strings';
import type { ArticleReaderSource, ReaderLoadState } from '../types/reader';

interface ArticleViewerProps {
    source: ArticleReaderSource;
    onLoadStateChange: (state: ReaderLoadState) => void;
    onTextSelected: (text: string) => void;
}

export const ArticleViewer = React.memo(function ArticleViewer({
    source,
    onLoadStateChange,
    onTextSelected,
}: ArticleViewerProps) {
    useEffect(() => {
        onLoadStateChange('ready');
    }, [onLoadStateChange]);

    const handleMouseUp = useCallback(() => {
        const text = window.getSelection()?.toString().trim() ?? '';
        if (text.length > 0) onTextSelected(text);
    }, [onTextSelected]);

    return (
        <div
            className="h-full overflow-y-auto bg-[var(--color-surface)]"
            onMouseUp={handleMouseUp}
            role="document"
            aria-label={strings.reader.sourcePane}
        >
            <article className="max-w-[680px] mx-auto px-6 py-8">
                <header className="mb-6">
                    <h1 className="text-xl font-semibold text-[var(--color-text-primary)] leading-snug mb-2">
                        {source.title}
                    </h1>
                    {source.excerpt && (
                        <p className="text-sm text-[var(--color-text-muted)] italic">
                            {source.excerpt}
                        </p>
                    )}
                    <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--color-primary)] hover:underline mt-1 inline-block"
                    >
                        {new URL(source.url).hostname}
                    </a>
                </header>
                <div
                    className="prose prose-sm text-[var(--color-text-primary)] leading-relaxed [&_a]:text-[var(--color-primary)] [&_img]:rounded [&_img]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: source.content }}
                />
            </article>
        </div>
    );
});
