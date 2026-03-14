/**
 * ReaderShell — Two-pane reader layout using react-resizable-panels.
 * Composable: hosted inside FocusOverlay or ReaderSidePanel.
 * Source viewer (PDF/Image) on one side, note editor on the other.
 * All high-frequency UI state stays in local useReducer.
 */
import React, { useCallback, useMemo, Suspense } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import type { Editor } from '@tiptap/core';
import { useReaderReducer } from '../hooks/useReaderReducer';
import { ReaderToolbar } from './ReaderToolbar';
import { SelectionBanner } from './SelectionBanner';
import { PdfViewer } from './PdfViewer';
import { ImageViewer } from './ImageViewer';
import { ArticleViewer } from './ArticleViewer';
import { TipTapEditor } from '@/features/canvas/components/nodes/TipTapEditor';
import { strings } from '@/shared/localization/strings';
import { useQuoteActions } from '../hooks/useQuoteActions';
import type { ReaderSource, ReaderLoadState } from '../types/reader';

interface ReaderShellProps {
    source: ReaderSource;
    sessionId: number;
    editor: Editor | null;
    isEditing: boolean;
    nodeId: string;
    onClose: () => void;
}

export const ReaderShell = React.memo(function ReaderShell({
    source, sessionId, editor, isEditing, nodeId, onClose,
}: ReaderShellProps) {
    const { state, flipPanes, setPage, setTotalPages, setSelection, setLoadState } = useReaderReducer();
    const { addToNote, createNodeFromQuote } = useQuoteActions({ editor, source, nodeId, sessionId });

    const handlePrevPage = useCallback(() => setPage(state.currentPage - 1), [setPage, state.currentPage]);
    const handleNextPage = useCallback(() => setPage(state.currentPage + 1), [setPage, state.currentPage]);

    const handleTextSelected = useCallback(
        (text: string) => setSelection(text),
        [setSelection],
    );

    const handleLoadState = useCallback((s: ReaderLoadState) => setLoadState(s), [setLoadState]);

    const sourceViewer = useMemo(() => {
        if (source.type === 'pdf') {
            return (
                <PdfViewer url={source.url} currentPage={state.currentPage} onTotalPages={setTotalPages}
                    onLoadStateChange={handleLoadState} onTextSelected={handleTextSelected} />
            );
        }
        if (source.type === 'article') {
            return (
                <ArticleViewer source={source} onLoadStateChange={handleLoadState}
                    onTextSelected={handleTextSelected} />
            );
        }
        return <ImageViewer url={source.url} filename={source.filename} onLoadStateChange={handleLoadState} />;
    }, [source, state.currentPage, setTotalPages, handleLoadState, handleTextSelected]);

    const isSourceLeft = state.paneSide === 'left';
    const loadAnnouncement = getLoadAnnouncement(state.loadState);

    const sourceTitle = source.type === 'article' ? source.title : source.filename;

    const sourcePaneContent = (
        <Suspense fallback={<LoadingPane />}>
            {sourceViewer}
            <div className="sr-only" aria-live="polite" role="status">{loadAnnouncement}</div>
        </Suspense>
    );

    const notePane = (
        <div className="flex flex-col h-full bg-[var(--color-surface)]" role="region" aria-label={strings.reader.notePane}>
            <div className="shrink-0 px-4 pt-3 pb-2 border-b border-[var(--color-border)]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {strings.reader.notePaneHeading}
                </h3>
                <p className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5" title={sourceTitle}>
                    {sourceTitle}
                </p>
            </div>
            {state.selectionDraft && (
                <div className="shrink-0 px-4 pt-2">
                    <SelectionBanner text={state.selectionDraft}
                        page={source.type === 'pdf' ? state.currentPage : undefined}
                        onAddToNote={addToNote} onCreateNode={createNodeFromQuote} />
                </div>
            )}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col">
                <TipTapEditor editor={editor} isEditable={isEditing} />
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full bg-[var(--color-surface-elevated)]">
            <ReaderToolbar currentPage={state.currentPage} totalPages={state.totalPages} isPdf={source.type === 'pdf'}
                onPrevPage={handlePrevPage} onNextPage={handleNextPage} onFlipPanes={flipPanes} onClose={onClose} />
            <Group orientation="horizontal" className="flex-1 min-h-0">
                <Panel defaultSize={55} minSize={25}>
                    <div className="h-full overflow-hidden" role="region" aria-label={strings.reader.sourcePane}>
                        {isSourceLeft ? sourcePaneContent : notePane}
                    </div>
                </Panel>
                <Separator className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-primary)] transition-colors cursor-col-resize" />
                <Panel defaultSize={45} minSize={20}>
                    <div className="h-full overflow-hidden">{isSourceLeft ? notePane : sourcePaneContent}</div>
                </Panel>
            </Group>
        </div>
    );
});

function getLoadAnnouncement(loadState: ReaderLoadState): string {
    const map: Record<string, string> = {
        ready: strings.reader.documentReady,
        error: strings.reader.loadError,
        loading: strings.reader.loading,
    };
    return map[loadState] ?? '';
}

const LoadingPane = React.memo(function LoadingPane() {
    return (
        <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
            {strings.reader.loading}
        </div>
    );
});
