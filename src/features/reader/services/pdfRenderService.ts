/**
 * pdfRenderService — Lazy-loads pdfjs-dist and provides
 * document loading + page rendering helpers for the PdfViewer.
 *
 * Fit-to-width: when a containerWidth is provided, the page
 * scales to fill the available width.  The canvas is rendered
 * at devicePixelRatio resolution for crisp text on high-DPI
 * screens, then CSS-sized to the logical display dimensions.
 */
import type { SafeReaderUrl } from '../types/reader';
import type * as PdfjsTypes from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

type PdfjsLib = typeof PdfjsTypes;
type PDFDocumentProxy = Awaited<ReturnType<PdfjsLib['getDocument']>['promise']>;

const FALLBACK_SCALE = 1.5;

let pdfjsPromise: Promise<PdfjsLib> | null = null;
let pdfjsCached: PdfjsLib | null = null;

async function loadPdfjs(): Promise<PdfjsLib> {
    if (pdfjsCached) return pdfjsCached;
    pdfjsPromise ??= import('pdfjs-dist').then((mod) => {
        mod.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
        pdfjsCached = mod;
        return mod;
    });
    return pdfjsPromise;
}

export async function loadPdfDocument(url: SafeReaderUrl): Promise<PDFDocumentProxy> {
    const pdfjs = await loadPdfjs();
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = new Uint8Array(await response.arrayBuffer());
    return pdfjs.getDocument(data).promise;
}

function createRenderControl() {
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;
    return {
        isCancelled: () => cancelled,
        setRenderTask(task: { cancel: () => void }) { renderTask = task; },
        cancel() { cancelled = true; renderTask?.cancel(); },
    };
}

export interface RenderHandle {
    promise: Promise<void>;
    cancel: () => void;
}

export function renderPdfPage(
    doc: PDFDocumentProxy,
    pageNum: number,
    canvas: HTMLCanvasElement,
    textContainer: HTMLDivElement,
    containerWidth?: number,
): RenderHandle {
    const ctrl = createRenderControl();

    const promise = (async () => {
        const clampedPage = Math.max(1, Math.min(pageNum, doc.numPages));
        const page = await doc.getPage(clampedPage);
        if (ctrl.isCancelled()) return;

        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
        const baseViewport = page.getViewport({ scale: 1 });
        const cssScale = containerWidth && containerWidth > 0
            ? containerWidth / baseViewport.width
            : FALLBACK_SCALE;
        const renderScale = cssScale * dpr;
        const renderViewport = page.getViewport({ scale: renderScale });
        const cssWidth = baseViewport.width * cssScale;
        const cssHeight = baseViewport.height * cssScale;

        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        const task = page.render({ canvas, viewport: renderViewport });
        ctrl.setRenderTask(task);
        await task.promise;
        if (ctrl.isCancelled()) return;

        const cssViewport = page.getViewport({ scale: cssScale });
        const textContent = await page.getTextContent();
        if (ctrl.isCancelled()) return;
        textContainer.innerHTML = '';
        textContainer.style.width = `${cssWidth}px`;
        textContainer.style.height = `${cssHeight}px`;

        const pdfjs = await loadPdfjs();
        const tl = new pdfjs.TextLayer({
            textContentSource: textContent,
            container: textContainer,
            viewport: cssViewport,
        });
        await tl.render();
    })();

    return { promise, cancel: () => ctrl.cancel() };
}
