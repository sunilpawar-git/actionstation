/**
 * Gemini Service — AI content generation and transformation
 * Routes all API calls through geminiClient SSOT (proxy or direct)
 */
import { strings } from '@/shared/localization/strings';
import {
    callGemini, isGeminiAvailable, extractGeminiText,
} from '@/features/knowledgeBank/services/geminiClient';
import type { GeminiRequestBody } from '@/features/knowledgeBank/services/geminiClient';
import type { ContentMode } from '@/features/canvas/types/contentMode';
import {
    SYSTEM_PROMPTS, TRANSFORMATION_PROMPTS, TEXT_TO_MINDMAP_PROMPT, MINDMAP_TRANSFORM_SUFFIX,
} from './geminiPrompts';
import type { TransformationType } from '../types/transformation';

export type { TransformationType } from '../types/transformation';

// ── Generation Config Constants ──────────────────────────

const DEFAULT_MAX_TOKENS = 1024;
const MINDMAP_MAX_TOKENS = 2048;
const GENERATION_TEMPERATURE = 0.7;
const TRANSFORM_TEMPERATURE = 0.5;

// ── System Instruction Helpers ───────────────────────────

const MAX_SYSTEM_CHARS = 100_000;

function buildSystemText(
    basePrompt: string,
    nodePoolContext: string | undefined,
    nodePoolGuidance: string,
    knowledgeBankContext: string | undefined,
    kbGuidance: string
): string {
    let text = basePrompt;
    if (nodePoolContext) text += `\n\n${nodePoolGuidance}\n\n${nodePoolContext}`;

    if (knowledgeBankContext) {
        const kbBlock = `\n\n${kbGuidance}\n\n${knowledgeBankContext}`;
        const remaining = MAX_SYSTEM_CHARS - text.length;
        if (remaining >= kbBlock.length) {
            text += kbBlock;
        } else if (remaining > kbGuidance.length + 10) {
            text += kbBlock.slice(0, remaining);
        }
    }

    return text;
}

function buildSystemInstruction(
    basePrompt: string,
    nodePoolContext: string | undefined,
    nodePoolGuidance: string,
    knowledgeBankContext: string | undefined,
    kbGuidance: string
): { parts: Array<{ text: string }> } {
    const text = buildSystemText(basePrompt, nodePoolContext, nodePoolGuidance, knowledgeBankContext, kbGuidance);
    return { parts: [{ text }] };
}

// ── Response Handler ────────────────────────────────────

const RETRY_DELAY_MS = 1000;

function parseResult(result: { ok: boolean; status: number; data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message: string; code: number } } | null }): string {
    if (!result.ok) {
        if (result.status === 429) throw new Error(strings.errors.quotaExceeded);
        throw new Error(strings.errors.aiError);
    }
    if (result.data?.error) throw new Error(result.data.error.message || strings.errors.aiError);
    const text = extractGeminiText(result.data);
    if (!text) throw new Error(strings.errors.aiError);
    return text;
}

async function callAndExtract(body: GeminiRequestBody): Promise<string> {
    const result = await callGemini(body);
    try {
        return parseResult(result);
    } catch (firstError) {
        const is429 = firstError instanceof Error
            && firstError.message === strings.errors.quotaExceeded;
        if (is429) throw firstError;

        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        const retryResult = await callGemini(body);
        return parseResult(retryResult);
    }
}

// ── Public API ──────────────────────────────────────────

/** Generate content from a single prompt */
export async function generateContent(
    prompt: string,
    nodePoolContext?: string,
    knowledgeBankContext?: string,
    contentMode?: ContentMode,
): Promise<string> {
    if (!isGeminiAvailable()) throw new Error(strings.errors.aiError);

    const basePrompt = contentMode === 'mindmap'
        ? SYSTEM_PROMPTS.mindmapGeneration
        : SYSTEM_PROMPTS.singleNode;

    const body: GeminiRequestBody = {
        contents: [{ parts: [{ text: `User request: ${prompt}` }] }],
        generationConfig: { temperature: GENERATION_TEMPERATURE, maxOutputTokens: contentMode === 'mindmap' ? MINDMAP_MAX_TOKENS : DEFAULT_MAX_TOKENS },
        systemInstruction: buildSystemInstruction(
            basePrompt, nodePoolContext, strings.nodePool.ai.usageGuidance,
            knowledgeBankContext, strings.knowledgeBank.ai.kbUsageGuidance
        ),
    };
    return callAndExtract(body);
}

/** Generate content with upstream context from connected nodes */
export async function generateContentWithContext(
    prompt: string,
    contextChain: string[],
    nodePoolContext?: string,
    knowledgeBankContext?: string,
    contentMode?: ContentMode,
): Promise<string> {
    if (contextChain.length === 0) {
        return generateContent(prompt, nodePoolContext, knowledgeBankContext, contentMode);
    }
    if (!isGeminiAvailable()) throw new Error(strings.errors.aiError);

    const contextSection = contextChain
        .map((content, i) => `[Connected Idea ${i + 1}]: ${content}`)
        .join('\n\n');

    const userPrompt = `Connected ideas (from edge relationships):
${contextSection}

User's prompt: ${prompt}

Generate content that synthesizes and builds upon the connected ideas above.`;

    const basePrompt = contentMode === 'mindmap'
        ? SYSTEM_PROMPTS.mindmapGeneration
        : SYSTEM_PROMPTS.chainGeneration;

    const body: GeminiRequestBody = {
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: GENERATION_TEMPERATURE, maxOutputTokens: contentMode === 'mindmap' ? MINDMAP_MAX_TOKENS : DEFAULT_MAX_TOKENS },
        systemInstruction: buildSystemInstruction(
            basePrompt, nodePoolContext, strings.nodePool.ai.usageGuidance,
            knowledgeBankContext, strings.knowledgeBank.ai.kbUsageGuidance
        ),
    };
    return callAndExtract(body);
}

/** Transform content using AI (refine, shorten, lengthen, proofread) */
export async function transformContent(
    content: string,
    type: TransformationType,
    nodePoolContext?: string,
    knowledgeBankContext?: string,
    contentMode?: ContentMode,
): Promise<string> {
    if (!isGeminiAvailable()) throw new Error(strings.errors.aiError);

    const userPrompt = `Text to transform:\n${content}\n\nTransformed text:`;
    const basePrompt = contentMode === 'mindmap'
        ? TRANSFORMATION_PROMPTS[type] + MINDMAP_TRANSFORM_SUFFIX
        : TRANSFORMATION_PROMPTS[type];

    const body: GeminiRequestBody = {
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: TRANSFORM_TEMPERATURE, maxOutputTokens: contentMode === 'mindmap' ? MINDMAP_MAX_TOKENS : DEFAULT_MAX_TOKENS },
        systemInstruction: buildSystemInstruction(
            basePrompt, nodePoolContext, strings.nodePool.ai.transformGuidance,
            knowledgeBankContext, strings.knowledgeBank.ai.kbTransformGuidance
        ),
    };
    return callAndExtract(body);
}

/** Convert existing prose content into hierarchical mindmap markdown via AI. */
export async function convertTextToMindmap(
    content: string,
    nodePoolContext?: string,
    knowledgeBankContext?: string,
): Promise<string> {
    if (!isGeminiAvailable()) throw new Error(strings.errors.aiError);

    const body: GeminiRequestBody = {
        contents: [{ parts: [{ text: `Text to convert into a mindmap:\n${content}` }] }],
        generationConfig: { temperature: TRANSFORM_TEMPERATURE, maxOutputTokens: MINDMAP_MAX_TOKENS },
        systemInstruction: buildSystemInstruction(
            TEXT_TO_MINDMAP_PROMPT, nodePoolContext, strings.nodePool.ai.transformGuidance,
            knowledgeBankContext, strings.knowledgeBank.ai.kbTransformGuidance
        ),
    };
    return callAndExtract(body);
}
