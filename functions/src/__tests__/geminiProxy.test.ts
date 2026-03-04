/**
 * geminiProxy Handler Tests
 * TDD: Validates auth, rate limiting, body validation, token capping, and Gemini forwarding
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleGeminiProxy } from '../geminiProxy.js';
import { clearRateLimitStore } from '../utils/rateLimiter.js';
import type { GeminiProxyRequest } from '../geminiProxy.js';

// Mock firebase-admin/auth
vi.mock('firebase-admin/auth', () => ({
    getAuth: () => ({
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-uid' }),
    }),
}));

const VALID_BODY: GeminiProxyRequest = {
    contents: [{ parts: [{ text: 'Summarize this text' }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
};

const MOCK_GEMINI_RESPONSE = {
    candidates: [{ content: { parts: [{ text: 'Summary result' }] } }],
};

const originalFetch = globalThis.fetch;

describe('geminiProxy', () => {
    beforeEach(async () => {
        vi.useFakeTimers();
        await clearRateLimitStore();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('handleGeminiProxy', () => {
        it('returns 500 when API key is missing', async () => {
            const result = await handleGeminiProxy(VALID_BODY, 'user-1', '');
            expect(result.status).toBe(500);
            expect(result.data.error).toContain('not configured');
        });

        it('returns 429 when rate limited', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(MOCK_GEMINI_RESPONSE),
            }));

            // Exhaust the rate limit (GEMINI_RATE_LIMIT = 60)
            for (let i = 0; i < 60; i++) {
                await handleGeminiProxy(VALID_BODY, 'rate-user', 'test-key');
            }

            const result = await handleGeminiProxy(VALID_BODY, 'rate-user', 'test-key');
            expect(result.status).toBe(429);
            expect(result.data.error).toContain('Rate limit');
        });

        it('returns 400 when contents is missing', async () => {
            const result = await handleGeminiProxy({}, 'user-1', 'test-key');
            expect(result.status).toBe(400);
            expect(result.data.error).toContain('contents');
        });

        it('returns 400 when contents is empty array', async () => {
            const result = await handleGeminiProxy(
                { contents: [] }, 'user-1', 'test-key',
            );
            expect(result.status).toBe(400);
        });

        it('returns 400 when body exceeds size limit', async () => {
            const hugeContent = 'x'.repeat(200_000);
            const body: GeminiProxyRequest = {
                contents: [{ parts: [{ text: hugeContent }] }],
            };
            const result = await handleGeminiProxy(body, 'user-1', 'test-key');
            expect(result.status).toBe(400);
            expect(result.data.error).toContain('size');
        });

        it('forwards request to Gemini and returns response', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(MOCK_GEMINI_RESPONSE),
            }));

            const result = await handleGeminiProxy(VALID_BODY, 'user-1', 'test-key');
            expect(result.status).toBe(200);
            expect(result.data).toEqual(MOCK_GEMINI_RESPONSE);
        });

        it('includes API key in the forwarded URL', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(MOCK_GEMINI_RESPONSE),
            });
            vi.stubGlobal('fetch', mockFetch);

            await handleGeminiProxy(VALID_BODY, 'user-1', 'test-api-key-placeholder');

            const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
            expect(calledUrl).toContain('key=test-api-key-placeholder');
        });

        it('caps maxOutputTokens to 2048', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(MOCK_GEMINI_RESPONSE),
            });
            vi.stubGlobal('fetch', mockFetch);

            const body: GeminiProxyRequest = {
                contents: [{ parts: [{ text: 'test' }] }],
                generationConfig: { maxOutputTokens: 99999 },
            };
            await handleGeminiProxy(body, 'user-1', 'test-key');

            const sentBody = JSON.parse(
                mockFetch.mock.calls[0]?.[1]?.body as string,
            ) as GeminiProxyRequest;
            expect(sentBody.generationConfig?.maxOutputTokens).toBe(2048);
        });

        it('preserves maxOutputTokens when within limit', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(MOCK_GEMINI_RESPONSE),
            });
            vi.stubGlobal('fetch', mockFetch);

            const body: GeminiProxyRequest = {
                contents: [{ parts: [{ text: 'test' }] }],
                generationConfig: { maxOutputTokens: 512 },
            };
            await handleGeminiProxy(body, 'user-1', 'test-key');

            const sentBody = JSON.parse(
                mockFetch.mock.calls[0]?.[1]?.body as string,
            ) as GeminiProxyRequest;
            expect(sentBody.generationConfig?.maxOutputTokens).toBe(512);
        });

        it('returns upstream error when Gemini returns non-ok', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ error: { message: 'Bad prompt' } }),
            }));

            const result = await handleGeminiProxy(VALID_BODY, 'user-1', 'test-key');
            expect(result.status).toBe(400);
            expect(result.data.error).toContain('error');
        });

        it('returns 502 when fetch throws', async () => {
            vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')));

            const result = await handleGeminiProxy(VALID_BODY, 'user-1', 'test-key');
            expect(result.status).toBe(502);
        });

        it('uses GEMINI_FETCH_TIMEOUT_MS (30s) for the abort controller', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(MOCK_GEMINI_RESPONSE),
            });
            vi.stubGlobal('fetch', mockFetch);
            const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

            await handleGeminiProxy(VALID_BODY, 'user-1', 'test-key');

            const abortCall = setTimeoutSpy.mock.calls.find(
                ([, ms]) => ms === 30_000,
            );
            expect(abortCall).toBeDefined();

            setTimeoutSpy.mockRestore();
        });

        it('supports vision requests with inlineData', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(MOCK_GEMINI_RESPONSE),
            }));

            const visionBody: GeminiProxyRequest = {
                contents: [{
                    parts: [
                        { text: 'Describe this image' },
                        { inlineData: { mimeType: 'image/jpeg', data: 'base64...' } },
                    ],
                }],
            };

            const result = await handleGeminiProxy(visionBody, 'user-1', 'test-key');
            expect(result.status).toBe(200);
        });
    });
});
