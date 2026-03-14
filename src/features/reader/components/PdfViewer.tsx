/**
 * PdfViewer — Paged PDF renderer with selectable text layer.
 * Uses pdfjs-dist (already installed) for rendering.
 * Bounded page cache: only current page rendered at a time.
 * Session-scoped: aborts rendering on unmount or source switch.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { strings } from '@/shared/localization/strings';
import type { SafeReaderUrl, ReaderLoadState } from '../types/reader';
import { loadPdfDocument, renderPdfPage } from '../services/pdfRenderService';

interface PdfViewerProps {
    url: SafeReaderUrl;
    currentPage: number;
    onTotalPages: (total: number) => void;
    onLoadStateChange: (state: ReaderLoadState) => void;
    onTextSelected: (text: string) => void;
}

export const PdfViewer = React.memo(function PdfViewer({
    url,
    currentPage,
    onTotalPages,
    onLoadStateChange,
    onTextSelected,
}: PdfViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [pdfDoc, setPdfDoc] = useState<Awaited<ReturnType<typeof loadPdfDocument>> | null>(null);

    useEffect(() => {
        let cancelled = false;

        loadPdfDocument(url).then((doc) => {
            if (cancelled) { doc.destroy().catch(() => undefined); return; }
            setPdfDoc(doc);
            onTotalPages(doc.numPages);
            onLoadStateChange('ready');
        }).catch((err: unknown) => {
            if (cancelled) return;
            setError(err instanceof Error ? err.message : strings.reader.loadError);
            onLoadStateChange('error');
        });

        return () => { cancelled = true; };
    }, [url, onTotalPages, onLoadStateChange]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const textContainer = textLayerRef.current;
        if (!pdfDoc || !canvas || !textContainer) return;

        let cancelled = false;
        renderPdfPage(pdfDoc, currentPage, canvas, textContainer).catch(() => {
            if (!cancelled) setError(strings.reader.loadError);
        });

        return () => { cancelled = true; };
    }, [pdfDoc, currentPage]);

    const handleMouseUp = useCallback(() => {
        const text = window.getSelection()?.toString().trim() ?? '';
        if (text.length > 0) onTextSelected(text);
    }, [onTextSelected]);

    if (error) {
        return (
            <PdfErrorState error={error} url={url} />
        );
    }

    return (
        <div
            className="relative overflow-auto h-full flex justify-center bg-[var(--color-surface)]"
            onMouseUp={handleMouseUp}
            role="document"
            aria-label={strings.reader.sourcePane}
        >
            <div className="relative inline-block">
                <canvas ref={canvasRef} className="block" />
                <div
                    ref={textLayerRef}
                    className="absolute top-0 left-0 overflow-hidden opacity-25 leading-none"
                    style={{ mixBlendMode: 'multiply' }}
                />
            </div>
        </div>
    );
});

const PdfErrorState = React.memo(function PdfErrorState({ error, url }: { error: string; url: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--color-text-muted)] p-6">
            <p className="text-sm">{error}</p>
            <a href={url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[var(--color-primary)] hover:underline">
                {strings.reader.openExternal}
            </a>
        </div>
    );
});
