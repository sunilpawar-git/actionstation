import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/features/auth/services/authTokenService', () => ({
    getAuthToken: vi.fn().mockResolvedValue('mock-token'),
}));

describe('geminiClient timeout', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.resetModules();
    });

    it('passes AbortSignal.timeout to fetch in callViaProxy path', async () => {
        let capturedSignal: AbortSignal | undefined;

        globalThis.fetch = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
            capturedSignal = init?.signal ?? undefined;
            return Promise.resolve(new Response(JSON.stringify({ candidates: [] }), { status: 200 }));
        }) as unknown as typeof globalThis.fetch;

        const { callGemini } = await import('../../services/geminiClient');
        const body = { contents: [{ parts: [{ text: 'test' }] }] };

        await callGemini(body);

        expect(capturedSignal).toBeDefined();
    });

    it('returns error result when fetch rejects (e.g. abort)', async () => {
        vi.stubEnv('VITE_GEMINI_API_KEY', '');

        globalThis.fetch = vi.fn(() =>
            Promise.reject(new Error('The operation was aborted')),
        ) as unknown as typeof globalThis.fetch;

        const { callGemini } = await import('../../services/geminiClient');
        const body = { contents: [{ parts: [{ text: 'test' }] }] };

        const result = await callGemini(body);

        expect(result.ok).toBe(false);
        expect(result.status).toBe(0);
        expect(result.data).toBeNull();
    });

    it('exports CLIENT_TIMEOUT_MS as a named constant', async () => {
        const { CLIENT_TIMEOUT_MS } = await import('../../services/geminiClient');

        expect(CLIENT_TIMEOUT_MS).toBe(35_000);
    });
});
