/**
 * pdfRenderService — Lazy-loads pdfjs-dist and provides
 * document loading + page rendering helpers for the PdfViewer.
 */
import type { SafeReaderUrl } from '../types/reader';
import type * as PdfjsTypes from 'pdfjs-dist';

type PdfjsLib = typeof PdfjsTypes;
type PDFDocumentProxy = Awaited<ReturnType<PdfjsLib['getDocument']>['promise']>;

const PDF_RENDER_SCALE = 1.5;

let pdfjsPromise: Promise<PdfjsLib> | null = null;
let pdfjsCached: PdfjsLib | null = null;

async function loadPdfjs(): Promise<PdfjsLib> {
    if (pdfjsCached) return pdfjsCached;
    pdfjsPromise ??= import('pdfjs-dist').then((mod) => {
        mod.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.mjs',
            import.meta.url,
        ).toString();
        pdfjsCached = mod;
        return mod;
    });
    return pdfjsPromise;
}

export async function loadPdfDocument(url: SafeReaderUrl): Promise<PDFDocumentProxy> {
    const pdfjs = await loadPdfjs();
    return pdfjs.getDocument(url).promise;
}

export async function renderPdfPage(
    doc: PDFDocumentProxy,
    pageNum: number,
    canvas: HTMLCanvasElement,
    textContainer: HTMLDivElement,
): Promise<void> {
    const clampedPage = Math.max(1, Math.min(pageNum, doc.numPages));
    const page = await doc.getPage(clampedPage);

    const scale = PDF_RENDER_SCALE * (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    const viewport = page.getViewport({ scale });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvas, viewport }).promise;

    const textContent = await page.getTextContent();
    textContainer.innerHTML = '';
    textContainer.style.width = `${viewport.width}px`;
    textContainer.style.height = `${viewport.height}px`;

    const pdfjs = await loadPdfjs();
    const textLayer = new pdfjs.TextLayer({
        textContentSource: textContent,
        container: textContainer,
        viewport,
    });
    await textLayer.render();
}
