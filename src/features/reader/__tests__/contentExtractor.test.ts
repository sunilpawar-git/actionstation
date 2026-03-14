import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArticleFromHtml, buildArticleSource, extractArticleContent } from '../services/contentExtractor';
import type { SafeReaderUrl } from '../types/reader';

const sampleHtml = `
<!DOCTYPE html>
<html>
<head><title>Test Article</title></head>
<body>
<article>
<h1>Test Article Title</h1>
<p>This is the first paragraph of the article content. It needs to be long enough
for Readability to consider it as article content rather than navigation or boilerplate.
This paragraph contains important information that should be extracted.</p>
<p>Here is another paragraph with more detailed content about the topic at hand.
The Readability algorithm looks for significant text content to determine what is
the main article body versus navigation, sidebars, and other non-content elements.</p>
<p>A third paragraph helps ensure the content is substantial enough to be recognized
as an article. Readability uses various heuristics including text density, paragraph
count, and content-to-markup ratio to make its determination.</p>
</article>
</body>
</html>`;

describe('parseArticleFromHtml', () => {
    it('extracts title from HTML', () => {
        const result = parseArticleFromHtml(sampleHtml, 'https://example.com/article');
        expect(result).not.toBeNull();
        expect(result?.title).toBeTruthy();
    });

    it('extracts content from HTML', () => {
        const result = parseArticleFromHtml(sampleHtml, 'https://example.com/article');
        expect(result?.content).toBeTruthy();
        expect(result?.content).toContain('paragraph');
    });

    it('returns null for empty HTML', () => {
        expect(parseArticleFromHtml('', 'https://example.com')).toBeNull();
    });

    it('extracts minimal content from nav-only HTML', () => {
        const nav = '<html><body><nav><a href="/">Home</a></nav></body></html>';
        const result = parseArticleFromHtml(nav, 'https://example.com');
        if (result) {
            expect(result.content.length).toBeLessThan(200);
        }
    });

    it('sanitizes script tags from extracted content', () => {
        const xssHtml = `<html><body><article>
            <p>${'Safe paragraph. '.repeat(20)}</p>
            <script>alert('xss')</script>
            <p>${'Another safe paragraph. '.repeat(20)}</p>
        </article></body></html>`;
        const result = parseArticleFromHtml(xssHtml, 'https://example.com/xss');
        if (result) {
            expect(result.content).not.toContain('<script');
            expect(result.content).not.toContain('alert');
        }
    });

    it('sanitizes inline event handlers from extracted content', () => {
        const xssHtml = `<html><body><article>
            <p>${'Content paragraph. '.repeat(20)}</p>
            <img src="x" onerror="alert('xss')">
            <p>${'More content here. '.repeat(20)}</p>
        </article></body></html>`;
        const result = parseArticleFromHtml(xssHtml, 'https://example.com/xss');
        if (result) {
            expect(result.content).not.toContain('onerror');
        }
    });

    it('sanitizes iframe tags from extracted content', () => {
        const xssHtml = `<html><body><article>
            <p>${'Article text content. '.repeat(20)}</p>
            <iframe src="https://evil.com"></iframe>
            <p>${'More article text. '.repeat(20)}</p>
        </article></body></html>`;
        const result = parseArticleFromHtml(xssHtml, 'https://example.com/xss');
        if (result) {
            expect(result.content).not.toContain('<iframe');
        }
    });
});

vi.mock('@/shared/services/sentryService', () => ({
    captureError: vi.fn(),
}));

vi.mock('@/features/auth/services/authTokenService', () => ({
    getAuthToken: vi.fn().mockResolvedValue('mock-token'),
}));

describe('extractArticleContent — proxy-to-direct fallback', () => {
    const url = 'https://example.com/article' as SafeReaderUrl;

    const articleHtml = `
    <!DOCTYPE html><html><head><title>Fallback Article</title></head>
    <body><article>
    <h1>Fallback Article</h1>
    ${'<p>Substantial paragraph content for Readability detection. </p>'.repeat(5)}
    </article></body></html>`;

    beforeEach(() => {
        vi.spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('falls back to direct fetch when proxy fetch fails', async () => {
        const { isProxyConfigured } = await import('@/config/linkPreviewConfig');
        vi.mocked(isProxyConfigured).mockReturnValue(true);

        const mockFetch = vi.mocked(globalThis.fetch);
        mockFetch
            .mockRejectedValueOnce(new Error('CORS blocked'))
            .mockResolvedValueOnce(new Response(articleHtml, { status: 200 }));

        const result = await extractArticleContent(url);
        expect(result).not.toBeNull();
        expect(result?.title).toBeTruthy();
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('returns null when both proxy and direct fetch fail', async () => {
        const { isProxyConfigured } = await import('@/config/linkPreviewConfig');
        vi.mocked(isProxyConfigured).mockReturnValue(true);

        const mockFetch = vi.mocked(globalThis.fetch);
        mockFetch
            .mockRejectedValueOnce(new Error('CORS blocked'))
            .mockRejectedValueOnce(new Error('Network error'));

        const result = await extractArticleContent(url);
        expect(result).toBeNull();
    });
});

vi.mock('@/config/linkPreviewConfig', () => ({
    isProxyConfigured: vi.fn().mockReturnValue(false),
    getFetchArticleHtmlUrl: vi.fn().mockReturnValue('https://proxy.test/fetchArticleHtml'),
}));

describe('buildArticleSource', () => {
    it('builds ArticleReaderSource with correct type', () => {
        const url = 'https://example.com/article' as SafeReaderUrl;
        const article = {
            title: 'Test',
            content: '<p>Content</p>',
            excerpt: 'An excerpt',
            siteName: null,
            byline: null,
        };
        const source = buildArticleSource(url, article);
        expect(source.type).toBe('article');
        expect(source.mime).toBe('text/html');
        expect(source.title).toBe('Test');
        expect(source.content).toBe('<p>Content</p>');
        expect(source.sourceId).toContain('article-');
    });
});
