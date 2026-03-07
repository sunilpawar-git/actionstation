/**
 * Image Description Service — Uses Gemini Vision to describe images
 * Gracefully falls back to a placeholder if the API is unavailable
 * Single responsibility: Blob → AI-generated text description
 */
import { strings } from '@/shared/localization/strings';
import { captureError } from '@/shared/services/sentryService';
import { callGemini, isGeminiAvailable, extractGeminiText } from './geminiClient';
import { IMAGE_ACCEPTED_MIME_TYPES, IMAGE_MAX_FILE_SIZE } from '@/features/canvas/types/image';

/** SSOT-derived whitelist — no duplicate MIME arrays */
export const ALLOWED_IMAGE_MIMES: ReadonlySet<string> = new Set(IMAGE_ACCEPTED_MIME_TYPES);

/** Convert a Blob to a raw base64 string (no data: prefix) */
export async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            // Strip "data:...;base64," prefix
            const base64 = dataUrl.split(',')[1] ?? '';
            resolve(base64);
        };
        reader.onerror = () => reject(new Error(strings.canvas.imageReadFailed));
        reader.readAsDataURL(blob);
    });
}

/**
 * Describe an image using Gemini Vision API.
 * Returns a fallback description (never throws) if the API is
 * unavailable, rate-limited, or returns an error.
 */
export async function describeImageWithAI(
    blob: Blob,
    filename: string
): Promise<string> {
    const fallback = `${strings.knowledgeBank.imageDescriptionFallback}: ${filename}`;

    if (!blob.type || !ALLOWED_IMAGE_MIMES.has(blob.type)) return fallback;
    if (blob.size > IMAGE_MAX_FILE_SIZE) return fallback;
    if (!isGeminiAvailable()) return fallback;

    try {
        const base64Data = await blobToBase64(blob);
        const prompt = strings.knowledgeBank.imageDescriptionPrompt;

        const body = buildVisionRequestBody(prompt, base64Data, blob.type);
        const result = await callGemini(body);
        if (!result.ok) return fallback;

        return extractGeminiText(result.data) ?? fallback;
    } catch (e: unknown) {
        captureError(e instanceof Error ? e : new Error(String(e)));
        return fallback;
    }
}

/** Build the Gemini Vision multimodal request body */
function buildVisionRequestBody(
    prompt: string,
    base64Data: string,
    mimeType: string
) {
    return {
        contents: [{
            parts: [
                { inlineData: { mimeType, data: base64Data } },
            ],
        }],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 512,
        },
        systemInstruction: { parts: [{ text: prompt }] },
    };
}
