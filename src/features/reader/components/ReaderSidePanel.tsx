/**
 * ReaderSidePanel — Canvas-level side panel for reading sources.
 * Does NOT require focus mode — renders alongside the canvas.
 * Enables BASB multi-node workflow: read a source and create
 * multiple nodes from quotes without entering focus mode.
 */
import React, { useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useReaderPanelStore } from '../stores/readerPanelStore';
import { useReaderReducer } from '../hooks/useReaderReducer';
import { ReaderToolbar } from './ReaderToolbar';
import { SelectionBanner } from './SelectionBanner';
import { PdfViewer } from './PdfViewer';
import { ImageViewer } from './ImageViewer';
import { ArticleViewer } from './ArticleViewer';
import { useSidePanelQuoteActions } from '../hooks/useSidePanelQuoteActions';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { getPortalRoot } from '@/shared/utils/portalRoot';
import { strings } from '@/shared/localization/strings';
import type { ReaderLoadState } from '../types/reader';

export const ReaderSidePanel = React.memo(function ReaderSidePanel() {
    const isOpen = useReaderPanelStore((s) => s.isOpen);
    const readerContext = useReaderPanelStore((s) => s.readerContext);

    const handleClose = useCallback(() => {
        useReaderPanelStore.getState().closePanel();
    }, []);

    useEscapeLayer(ESCAPE_PRIORITY.KB_PANEL, isOpen, handleClose);

    if (!isOpen || !readerContext) return null;

    return createPortal(
        <ReaderSidePanelContent
            readerContext={readerContext}
            onClose={handleClose}
        />,
        getPortalRoot(),
    );
});

interface ContentProps {
    readerContext: NonNullable<ReturnType<typeof useReaderPanelStore.getState>['readerContext']>;
    onClose: () => void;
}

const ReaderSidePanelContent = React.memo(function ReaderSidePanelContent({
    readerContext,
    onClose,
}: ContentProps) {
    const { source } = readerContext;
    const { state, setPage, setTotalPages, setSelection, setLoadState } = useReaderReducer();
    const createNodeFromQuote = useSidePanelQuoteActions(source);

    const handlePrevPage = useCallback(() => setPage(state.currentPage - 1), [setPage, state.currentPage]);
    const handleNextPage = useCallback(() => setPage(state.currentPage + 1), [setPage, state.currentPage]);

    const handleLoadStateChange = useCallback(
        (loadState: ReaderLoadState) => setLoadState(loadState),
        [setLoadState],
    );

    const handleTextSelected = useCallback(
        (text: string) => setSelection(text),
        [setSelection],
    );

    const sourceViewer = useMemo(() => {
        if (source.type === 'pdf') {
            return (
                <PdfViewer url={source.url} currentPage={state.currentPage}
                    onTotalPages={setTotalPages} onLoadStateChange={handleLoadStateChange}
                    onTextSelected={handleTextSelected} />
            );
        }
        if (source.type === 'article') {
            return (
                <ArticleViewer source={source} onLoadStateChange={handleLoadStateChange}
                    onTextSelected={handleTextSelected} />
            );
        }
        return (
            <ImageViewer url={source.url} filename={source.filename}
                onLoadStateChange={handleLoadStateChange} />
        );
    }, [source, state.currentPage, setTotalPages, handleLoadStateChange, handleTextSelected]);

    return (
        <div
            className="fixed top-0 right-0 h-full w-[45vw] max-w-[700px] min-w-[320px] z-[var(--z-modal)] bg-[var(--color-surface-elevated)] border-l border-[var(--color-border)] shadow-lg flex flex-col animate-slide-in-right"
            role="complementary"
            aria-label={strings.reader.readerPanel}
        >
            <ReaderToolbar
                currentPage={state.currentPage}
                totalPages={state.totalPages}
                isPdf={source.type === 'pdf'}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
                onFlipPanes={() => { /* side panel has single pane — no flip */ }}
                onClose={onClose}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
                {sourceViewer}
            </div>
            {state.selectionDraft && (
                <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                    <SelectionBanner
                        text={state.selectionDraft}
                        page={source.type === 'pdf' ? state.currentPage : undefined}
                        onCreateNode={createNodeFromQuote}
                    />
                </div>
            )}
        </div>
    );
});
