/**
 * Reader feature — public API barrel export.
 * Two-pane BASB reader for PDFs, images, and web articles.
 */
export { ReaderShell } from './components/ReaderShell';
export { ReaderSidePanel } from './components/ReaderSidePanel';
export { useReaderPanelStore } from './stores/readerPanelStore';
export { resolveReaderSource } from './services/resolveReaderSource';
export { toSafeReaderUrl, toSafeArticleUrl, isReaderSupportedMime } from './utils/safeUrl';
export { extractArticleContent, buildArticleSource } from './services/contentExtractor';
export { insertQuoteIntoEditor, buildQuoteMarkdown } from './services/quoteInsertionService';
export type { ReaderSource, SafeReaderUrl, ReaderContext, ArticleReaderSource } from './types/reader';
