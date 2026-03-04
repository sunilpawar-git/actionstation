/**
 * Cross-Reference Orchestrator — runs cross-doc analysis after document insight.
 * Builds entity index, queries for matches, calls Gemini, spawns insight node.
 * Pure orchestration — no React hooks, no store subscriptions.
 */
import { useCanvasStore, getNodeMap } from '@/features/canvas/stores/canvasStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { callGemini } from '@/features/knowledgeBank/services/geminiClient';
import { captureError } from '@/shared/services/sentryService';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { trackCrossReferenceGenerated } from '@/shared/services/analyticsService';
import { createIdeaNode } from '@/features/canvas/types/node';
import { createEdge } from '@/features/canvas/types/edge';
import { buildEntityIndex, queryEntityIndex } from './entityIndexService';
import { buildCrossRefPrompt, buildCrossRefRequestBody, parseCrossRefResponse } from './crossReferenceService';
import { formatCrossRefMarkdown } from './crossRefFormatter';
import { extractEntities } from '../types/entityIndex';
import { calculateInsightPosition } from './insightNodeBuilder';
import type { ExtractionResult } from '../types/documentAgent';

/**
 * Attempt cross-reference analysis after document insight.
 * Fail-silent: errors are captured but don't surface to user.
 */
export async function attemptCrossReference(
    nodeId: string,
    workspaceId: string,
    result: ExtractionResult,
    filename: string,
): Promise<void> {
    const { nodes } = useCanvasStore.getState();

    const index = buildEntityIndex(nodes);
    if (index.entries.length === 0) return;

    const queryEntities = extractEntities(result);
    if (queryEntities.length === 0) return;

    const matches = queryEntityIndex(index, queryEntities, nodeId);
    if (matches.length === 0) return;

    const prompt = buildCrossRefPrompt(result, filename, matches);
    const body = buildCrossRefRequestBody(prompt);

    const geminiResult = await callGemini(body);
    if (!geminiResult.ok || !geminiResult.data) return;

    const responseText = geminiResult.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) return;

    const crossRefResult = parseCrossRefResponse(responseText);
    const hasContent = crossRefResult.connections.length > 0
        || crossRefResult.contradictions.length > 0
        || crossRefResult.actionItems.length > 0;

    if (!hasContent) return;

    const markdown = formatCrossRefMarkdown(crossRefResult, filename);
    const parentNode = getNodeMap(nodes).get(nodeId);
    if (!parentNode) return;

    const isFreeFlow = useSettingsStore.getState().canvasFreeFlow;
    const freshNodes = useCanvasStore.getState().nodes;
    const position = calculateInsightPosition(parentNode, freshNodes, isFreeFlow);
    const crossRefNodeId = `crossref-${crypto.randomUUID()}`;

    const node = createIdeaNode(crossRefNodeId, workspaceId, {
        x: position.x + 280,
        y: position.y,
    });
    node.data = {
        ...node.data,
        heading: strings.documentAgent.crossRefHeading,
        output: markdown,
        colorKey: 'warning',
        tags: [strings.documentAgent.autoExtractedTag, 'cross-reference'],
        includeInAIPool: true,
    };

    const edge = createEdge(
        `edge-${crypto.randomUUID()}`,
        workspaceId,
        nodeId,
        crossRefNodeId,
        'derived',
    );

    useCanvasStore.setState((s) => ({
        nodes: [...s.nodes, node],
        edges: [...s.edges, edge],
    }));

    toast.info(strings.documentAgent.crossRefFound);
    trackCrossReferenceGenerated(matches.length);
}

/**
 * Safe wrapper — catches all errors silently.
 * Cross-references are best-effort; failures should never block the user.
 */
export async function safeCrossReference(
    nodeId: string,
    workspaceId: string,
    result: ExtractionResult,
    filename: string,
): Promise<void> {
    try {
        await attemptCrossReference(nodeId, workspaceId, result, filename);
    } catch (error: unknown) {
        captureError(error instanceof Error ? error : new Error(strings.documentAgent.crossRefNone));
    }
}
