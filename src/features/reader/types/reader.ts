/**
 * Reader feature type contracts.
 * SafeReaderUrl is a branded type produced only by toSafeReaderUrl.
 * ReaderSource is a discriminated union for supported source types.
 */

/**
 * Branded type for validated URLs in the reader.
 *
 * Produced by `toSafeReaderUrl()` (attachment URLs: trusted origins only)
 * or `toSafeArticleUrl()` (article URLs: any HTTPS, parsed via Readability).
 * The weaker article validation is safe because the content is sanitized
 * by DOMPurify before rendering — never embedded directly.
 */
export type SafeReaderUrl = string & { readonly __brand: 'SafeReaderUrl' };

export type ReaderSourceType = 'pdf' | 'image' | 'article';

interface ReaderSourceBase {
    url: SafeReaderUrl;
    filename: string;
    sourceId: string;
}

export interface PdfReaderSource extends ReaderSourceBase {
    type: 'pdf';
    mime: 'application/pdf';
}

export interface ImageReaderSource extends ReaderSourceBase {
    type: 'image';
    mime: `image/${string}`;
}

export interface ArticleReaderSource extends ReaderSourceBase {
    type: 'article';
    mime: 'text/html';
    /** Article title extracted by Readability */
    title: string;
    /** Cleaned HTML content extracted by Readability */
    content: string;
    /** Optional excerpt from Readability */
    excerpt?: string;
}

export type ReaderSource = PdfReaderSource | ImageReaderSource | ArticleReaderSource;

export type PaneSide = 'left' | 'right';

export type ReaderLoadState = 'idle' | 'loading' | 'ready' | 'error' | 'blocked';

export interface ReaderLocalState {
    paneSide: PaneSide;
    currentPage: number;
    totalPages: number;
    selectionDraft: string;
    loadState: ReaderLoadState;
}

export interface ReaderContext {
    nodeId: string;
    source: ReaderSource;
    sessionId: number;
}
