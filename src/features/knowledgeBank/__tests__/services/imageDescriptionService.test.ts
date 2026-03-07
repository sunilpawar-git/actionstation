/**
 * ImageDescriptionService Tests — Gemini Vision image description
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCaptureError = vi.fn();
vi.mock('@/shared/services/sentryService', () => ({
    captureError: (...args: unknown[]) => mockCaptureError(...args),
}));

vi.mock('../../services/geminiClient', () => ({
    isGeminiAvailable: vi.fn().mockReturnValue(true),
    callGemini: vi.fn().mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } }),
    extractGeminiText: vi.fn().mockReturnValue(null),
}));

// eslint-disable-next-line import-x/first -- Must import after vi.mock
import { describeImageWithAI, blobToBase64, ALLOWED_IMAGE_MIMES } from '../../services/imageDescriptionService';
// eslint-disable-next-line import-x/first
import { isGeminiAvailable, callGemini, extractGeminiText } from '../../services/geminiClient';
// eslint-disable-next-line import-x/first
import { IMAGE_ACCEPTED_MIME_TYPES } from '@/features/canvas/types/image';

interface VisionBody {
    contents: Array<{ parts: Array<{ inlineData: { mimeType: string; data: string } }> }>;
    generationConfig?: { maxOutputTokens: number };
    systemInstruction?: { parts: Array<{ text: string }> };
}

describe('imageDescriptionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(isGeminiAvailable).mockReturnValue(true);
    });

    describe('blobToBase64', () => {
        it('converts a blob to base64 data string', async () => {
            const blob = new Blob(['hello'], { type: 'text/plain' });
            const base64 = await blobToBase64(blob);
            expect(typeof base64).toBe('string');
            expect(base64.length).toBeGreaterThan(0);
            expect(base64).not.toContain('data:');
        });

        it('rejects when FileReader fires onerror', async () => {
            const OriginalFileReader = globalThis.FileReader;
            globalThis.FileReader = class MockFileReader {
                onload: (() => void) | null = null;
                onerror: (() => void) | null = null;
                result: string | null = null;
                readAsDataURL() { setTimeout(() => this.onerror?.(), 0); }
            } as unknown as typeof FileReader;

            const blob = new Blob(['bad'], { type: 'image/png' });
            await expect(blobToBase64(blob)).rejects.toThrow('Failed to read image file.');

            globalThis.FileReader = OriginalFileReader;
        });
    });

    describe('MIME validation', () => {
        it('sends PNG blob.type as mimeType to buildVisionRequestBody', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue('desc');

            const blob = new Blob(['png-data'], { type: 'image/png' });
            await describeImageWithAI(blob, 'test.png');

            const body = vi.mocked(callGemini).mock.calls[0]![0] as VisionBody;
            expect(body.contents[0]!.parts[0]!.inlineData.mimeType).toBe('image/png');
        });

        it('sends JPEG blob.type as mimeType to buildVisionRequestBody', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue('desc');

            const blob = new Blob(['jpeg-data'], { type: 'image/jpeg' });
            await describeImageWithAI(blob, 'test.jpg');

            const body = vi.mocked(callGemini).mock.calls[0]![0] as VisionBody;
            expect(body.contents[0]!.parts[0]!.inlineData.mimeType).toBe('image/jpeg');
        });

        it('sends WebP blob.type as mimeType to buildVisionRequestBody', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue('desc');

            const blob = new Blob(['webp-data'], { type: 'image/webp' });
            await describeImageWithAI(blob, 'test.webp');

            const body = vi.mocked(callGemini).mock.calls[0]![0] as VisionBody;
            expect(body.contents[0]!.parts[0]!.inlineData.mimeType).toBe('image/webp');
        });

        it('sends GIF blob.type as mimeType to buildVisionRequestBody', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue('desc');

            const blob = new Blob(['gif-data'], { type: 'image/gif' });
            await describeImageWithAI(blob, 'test.gif');

            const body = vi.mocked(callGemini).mock.calls[0]![0] as VisionBody;
            expect(body.contents[0]!.parts[0]!.inlineData.mimeType).toBe('image/gif');
        });

        it('returns fallback for empty blob.type (not sent to API)', async () => {
            const blob = new Blob(['no-type']);
            const desc = await describeImageWithAI(blob, 'mystery.bin');

            expect(callGemini).not.toHaveBeenCalled();
            expect(desc).toContain('mystery.bin');
        });

        it('returns fallback for unsupported MIME image/svg+xml', async () => {
            const blob = new Blob(['<svg/>'], { type: 'image/svg+xml' });
            const desc = await describeImageWithAI(blob, 'icon.svg');

            expect(callGemini).not.toHaveBeenCalled();
            expect(desc).toContain('icon.svg');
        });

        it('returns fallback for unsupported MIME application/pdf', async () => {
            const blob = new Blob(['%PDF'], { type: 'application/pdf' });
            const desc = await describeImageWithAI(blob, 'doc.pdf');

            expect(callGemini).not.toHaveBeenCalled();
            expect(desc).toContain('doc.pdf');
        });

        it('returns fallback for blob exceeding IMAGE_MAX_FILE_SIZE', async () => {
            const oversized = new Blob([new ArrayBuffer(6 * 1024 * 1024)], { type: 'image/png' });
            const desc = await describeImageWithAI(oversized, 'huge.png');

            expect(callGemini).not.toHaveBeenCalled();
            expect(desc).toContain('huge.png');
        });

        it('ALLOWED_IMAGE_MIMES is derived from IMAGE_ACCEPTED_MIME_TYPES (SSOT)', () => {
            for (const mime of IMAGE_ACCEPTED_MIME_TYPES) {
                expect(ALLOWED_IMAGE_MIMES.has(mime)).toBe(true);
            }
            expect(ALLOWED_IMAGE_MIMES.size).toBe(IMAGE_ACCEPTED_MIME_TYPES.length);
        });
    });

    describe('describeImageWithAI', () => {
        it('returns AI-generated description on success', async () => {
            const geminiResponse = {
                candidates: [{
                    content: { parts: [{ text: 'A detailed chart showing revenue growth.' }] },
                }],
            };
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: geminiResponse });
            vi.mocked(extractGeminiText).mockReturnValue('A detailed chart showing revenue growth.');

            const blob = new Blob(['fake-image'], { type: 'image/jpeg' });
            const description = await describeImageWithAI(blob, 'chart.jpg');

            expect(description).toBe('A detailed chart showing revenue growth.');
        });

        it('sends request body with inlineData to callGemini', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue('desc');

            const blob = new Blob(['image-data'], { type: 'image/jpeg' });
            await describeImageWithAI(blob, 'test.jpg');

            expect(callGemini).toHaveBeenCalledOnce();
            const body = vi.mocked(callGemini).mock.calls[0]![0];
            expect(body.contents[0]!.parts).toHaveLength(1);
            expect(body.generationConfig?.maxOutputTokens).toBe(512);
        });

        it('sends prompt in systemInstruction, not in contents', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue('desc');

            const blob = new Blob(['image-data'], { type: 'image/jpeg' });
            await describeImageWithAI(blob, 'test.jpg');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText).toContain('Describe this image');
        });

        it('returns fallback description when Gemini is unavailable', async () => {
            vi.mocked(isGeminiAvailable).mockReturnValue(false);

            const blob = new Blob(['image-data'], { type: 'image/jpeg' });
            const description = await describeImageWithAI(blob, 'photo.jpg');

            expect(description).toContain('photo.jpg');
            expect(callGemini).not.toHaveBeenCalled();
        });

        it('returns fallback description on API error', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: false, status: 500, data: null });

            const blob = new Blob(['image-data'], { type: 'image/jpeg' });
            const description = await describeImageWithAI(blob, 'broken.jpg');

            expect(description).toContain('broken.jpg');
        });

        it('returns fallback on network failure and logs via captureError', async () => {
            const networkErr = new Error('Network error');
            vi.mocked(callGemini).mockRejectedValue(networkErr);

            const blob = new Blob(['image-data'], { type: 'image/jpeg' });
            const description = await describeImageWithAI(blob, 'offline.jpg');

            expect(description).toContain('offline.jpg');
            expect(mockCaptureError).toHaveBeenCalledWith(networkErr);
        });

        it('returns fallback when extractGeminiText returns null', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue(null);

            const blob = new Blob(['image-data'], { type: 'image/jpeg' });
            const description = await describeImageWithAI(blob, 'empty.jpg');

            expect(description).toContain('empty.jpg');
        });
    });
});
