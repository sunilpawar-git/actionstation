/**
 * Aggregation Orchestrator — runs periodic document summaries.
 * Triggered after every Nth analysis, respects cooldown.
 * Spawns or replaces an aggregation node on the canvas.
 */
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { callGemini } from '@/features/knowledgeBank/services/geminiClient';
import { captureError } from '@/shared/services/sentryService';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { trackAggregationGenerated } from '@/shared/services/analyticsService';
import { createIdeaNode } from '@/features/canvas/types/node';
import { buildEntityIndex } from './entityIndexService';
import {
    shouldTriggerAggregation,
    groupEntriesByClassification,
    buildAggregationPrompt,
    buildAggregationRequestBody,
    parseAggregationResponse,
} from './aggregationService';

let analysisCount = 0;
let lastAggregationAt = 0;

const AGGREGATION_TAG = 'aggregation';

/** Increment analysis counter and check if aggregation should run */
export function incrementAndCheck(): boolean {
    analysisCount += 1;
    return shouldTriggerAggregation(analysisCount, lastAggregationAt);
}

/** Reset counters (for testing) */
export function resetAggregationState(): void {
    analysisCount = 0;
    lastAggregationAt = 0;
}

function formatAggregationMarkdown(
    sections: Array<{ classification: string; summary: string }>,
): string {
    const lines = sections
        .filter((s) => s.summary)
        .map((s) => `**${s.classification}**: ${s.summary}`);
    return lines.join('\n\n');
}

/**
 * Run aggregation: build index, group, prompt Gemini, spawn/update node.
 * Fail-silent — errors captured but don't surface to user.
 */
export async function runAggregation(workspaceId: string): Promise<void> {
    const { nodes } = useCanvasStore.getState();
    const index = buildEntityIndex(nodes);
    if (index.entries.length < 2) return;

    const groups = groupEntriesByClassification(index.entries);
    if (groups.size === 0) return;

    const prompt = buildAggregationPrompt(groups);
    const body = buildAggregationRequestBody(prompt);

    const geminiResult = await callGemini(body);
    if (!geminiResult.ok || !geminiResult.data) return;

    const text = geminiResult.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return;

    const response = parseAggregationResponse(text);
    if (response.sections.length === 0) return;

    const markdown = formatAggregationMarkdown(response.sections);
    if (!markdown) return;

    const existingAgg = nodes.find(
        (n) => n.data.tags?.includes(AGGREGATION_TAG) && n.workspaceId === workspaceId,
    );

    if (existingAgg) {
        useCanvasStore.getState().updateNodeOutput(existingAgg.id, markdown);
    } else {
        const nodeId = `agg-${crypto.randomUUID()}`;
        const node = createIdeaNode(nodeId, workspaceId, { x: 50, y: 50 });
        node.data = {
            ...node.data,
            heading: strings.documentAgent.aggregationHeading,
            output: markdown,
            colorKey: 'warning',
            tags: [AGGREGATION_TAG, strings.documentAgent.autoExtractedTag],
            includeInAIPool: true,
        };
        useCanvasStore.setState((s) => ({ nodes: [...s.nodes, node] }));
    }

    lastAggregationAt = Date.now();
    toast.info(strings.documentAgent.aggregationHeading);
    trackAggregationGenerated(groups.size);
}

/**
 * Safe wrapper — catches all errors silently.
 */
export async function safeAggregation(workspaceId: string): Promise<void> {
    try {
        await runAggregation(workspaceId);
    } catch (error: unknown) {
        captureError(error instanceof Error ? error : new Error(strings.documentAgent.analysisFailed));
    }
}
