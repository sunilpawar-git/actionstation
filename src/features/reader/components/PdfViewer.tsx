/**
 * PdfViewer — Paged PDF renderer with selectable text layer.
 * Uses pdfjs-dist (already installed) for rendering.
 * Bounded page cache: only current page rendered at a time.
 * Session-scoped: aborts rendering on unmount or source switch.
 *
 * Fit-to-width: measures the container via ResizeObserver
 * and passes the width to renderPdfPage so each page scales
 * to fill the available space without horizontal scrolling.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { strings } from '@/shared/localization/strings';
import type { SafeReaderUrl, ReaderLoadState } from '../types/reader';
import { loadPdfDocument, renderPdfPage, type RenderHandle } from '../services/pdfRenderService';

const RESIZE_DEBOUNCE_MS = 150;

interface PdfViewerProps {
    url: SafeReaderUrl;
    currentPage: number;
    onTotalPages: (total: number) => void;
    onLoadStateChange: (state: ReaderLoadState) => void;
    onTextSelected: (text: string) => void;
}

function useDebouncedContainerWidth(ref: React.RefObject<HTMLDivElement | null>): number {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        let timer: ReturnType<typeof setTimeout>;
        const ro = new ResizeObserver(([entry]) => {
            if (!entry) return;
            clearTimeout(timer);
            timer = setTimeout(() => setWidth(Math.floor(entry.contentRect.width)), RESIZE_DEBOUNCE_MS);
        });
        ro.observe(el);
        setWidth(Math.floor(el.clientWidth));
        return () => { clearTimeout(timer); ro.disconnect(); };
    }, [ref]);
    return width;
}

export const PdfViewer = React.memo(function PdfViewer({
    url,
    currentPage,
    onTotalPages,
    onLoadStateChange,
    onTextSelected,
}: PdfViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [pdfDoc, setPdfDoc] = useState<Awaited<ReturnType<typeof loadPdfDocument>> | null>(null);
    const containerWidth = useDebouncedContainerWidth(containerRef);
    const activeRenderRef = useRef<RenderHandle | null>(null);

    useEffect(() => {
        let cancelled = false;

        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/d26e22b3-6755-4c07-a08d-25f78b15f908',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f51a9'},body:JSON.stringify({sessionId:'7f51a9',location:'PdfViewer.tsx:load-effect',message:'loadPdfDocument starting',data:{url:url.substring(0,80)},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
        // #endregion

        loadPdfDocument(url).then((doc) => {
            if (cancelled) { doc.destroy().catch(() => undefined); return; }
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/d26e22b3-6755-4c07-a08d-25f78b15f908',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f51a9'},body:JSON.stringify({sessionId:'7f51a9',location:'PdfViewer.tsx:load-success',message:'PDF loaded',data:{numPages:doc.numPages},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
            // #endregion
            setPdfDoc(doc);
            onTotalPages(doc.numPages);
            onLoadStateChange('ready');
        }).catch((err: unknown) => {
            if (cancelled) return;
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/d26e22b3-6755-4c07-a08d-25f78b15f908',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f51a9'},body:JSON.stringify({sessionId:'7f51a9',location:'PdfViewer.tsx:load-error',message:'PDF load failed',data:{err:String(err)},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
            // #endregion
            setError(err instanceof Error ? err.message : strings.reader.loadError);
            onLoadStateChange('error');
        });

        return () => { cancelled = true; };
    }, [url, onTotalPages, onLoadStateChange]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const textContainer = textLayerRef.current;
        if (!pdfDoc || !canvas || !textContainer || containerWidth === 0) return;

        activeRenderRef.current?.cancel();

        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/d26e22b3-6755-4c07-a08d-25f78b15f908',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f51a9'},body:JSON.stringify({sessionId:'7f51a9',location:'PdfViewer.tsx:render-effect',message:'renderPdfPage starting',data:{page:currentPage,containerWidth,canvasW:canvas.width,canvasH:canvas.height,textChildCount:textContainer.childElementCount},timestamp:Date.now(),hypothesisId:'H2,H3,H4'})}).catch(()=>{});
        // #endregion

        const handle = renderPdfPage(pdfDoc, currentPage, canvas, textContainer, containerWidth);
        activeRenderRef.current = handle;
        handle.promise.then(() => {
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/d26e22b3-6755-4c07-a08d-25f78b15f908',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f51a9'},body:JSON.stringify({sessionId:'7f51a9',location:'PdfViewer.tsx:render-success',message:'renderPdfPage done',data:{page:currentPage,canvasW:canvas.width,canvasH:canvas.height,textChildCount:textContainer.childElementCount,textLayerOpacity:textContainer.style.opacity,textLayerClasses:textContainer.className},timestamp:Date.now(),hypothesisId:'H1,H2,H5'})}).catch(()=>{});
            // #endregion
        }).catch((err: unknown) => {
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/d26e22b3-6755-4c07-a08d-25f78b15f908',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f51a9'},body:JSON.stringify({sessionId:'7f51a9',location:'PdfViewer.tsx:render-error',message:'renderPdfPage failed',data:{err:String(err)},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
            // #endregion
            if (activeRenderRef.current !== handle) return;
            setError(err instanceof Error ? err.message : strings.reader.loadError);
        });

        return () => { handle.cancel(); };
    }, [pdfDoc, currentPage, containerWidth]);

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
            ref={containerRef}
            className="relative overflow-auto h-full bg-[var(--color-surface)]"
            onMouseUp={handleMouseUp}
            role="document"
            aria-label={strings.reader.sourcePane}
        >
            <div className="relative mx-auto" style={{ width: containerWidth || undefined }}>
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
