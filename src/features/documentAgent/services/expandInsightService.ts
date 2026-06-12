/**
 * Expand Insight Service — breaks an insight node into child section nodes.
 * Pure function. All nodes + edges returned for single atomic setState().
 */
import { createIdeaNode, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '@/features/canvas/types/node';
import { createEdge } from '@/features/canvas/types/edge';
import { strings } from '@/shared/localization/strings';
import { formatBulletList } from '../utils/llmResponseUtils';
import { findNearestOpenSlot } from '@/features/canvas/services/spiralPlacement';
import { generateUUID } from '@/shared/utils/uuid';
import type { CanvasNode, NodeColorKey } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import type { ExtractionResult } from '../types/documentAgent';

interface ExpandResult {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
}

interface SectionDef {
    heading: string;
    items: string[];
    colorKey: NodeColorKey;
}

const FAN_SPACING_Y = 220;
const FAN_OFFSET_X = 40;

/** Build section definitions from extraction result, omitting empty sections */
function buildSections(result: ExtractionResult): SectionDef[] {
    const sections: SectionDef[] = [];

    if (result.summary) {
        sections.push({
            heading: strings.documentAgent.summarySection,
            items: [result.summary],
            colorKey: 'success',
        });
    }

    if (result.keyFacts.length > 0) {
        sections.push({
            heading: strings.documentAgent.keyFactsSection,
            items: result.keyFacts,
            colorKey: 'default',
        });
    }

    if (result.actionItems.length > 0) {
        sections.push({
            heading: strings.documentAgent.actionItemsSection,
            items: result.actionItems,
            colorKey: 'warning',
        });
    }

    if (result.questions.length > 0) {
        sections.push({
            heading: strings.documentAgent.questionsSection,
            items: result.questions,
            colorKey: 'danger',
        });
    }

    if (result.extendedFacts.length > 0) {
        sections.push({
            heading: strings.documentAgent.extendedFactsSection,
            items: result.extendedFacts,
            colorKey: 'default',
        });
    }

    return sections;
}

/**
 * Expand an insight node into individual child nodes — one per section.
 * Returns nodes + edges for a single atomic canvas setState().
 * @internal Planned for context-menu "Expand Insight" UI trigger.
 */
export function expandInsightToNodes(
    insightNode: CanvasNode,
    result: ExtractionResult,
    parentDocNodeId: string,
    existingNodes: CanvasNode[] = [],
): ExpandResult {
    const sections = buildSections(result);
    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];

    const allNodes = [insightNode, ...existingNodes.filter((n) => n.id !== insightNode.id)];

    for (const [i, section] of sections.entries()) {
        const nodeId = `expand-${generateUUID()}`;

        const idealPosition = {
            x: insightNode.position.x + FAN_OFFSET_X,
            y: insightNode.position.y + FAN_SPACING_Y * (i + 1),
        };

        const position = findNearestOpenSlot(
            idealPosition.x, idealPosition.y,
            DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT,
            allNodes,
        );

        const node = createIdeaNode(nodeId, insightNode.workspaceId, position);
        node.data = {
            ...node.data,
            heading: section.heading,
            output: formatBulletList(section.items),
            colorKey: section.colorKey,
            includeInAIPool: true,
        };

        const edge = createEdge(
            `edge-${generateUUID()}`,
            insightNode.workspaceId,
            parentDocNodeId,
            nodeId,
            'derived',
        );

        nodes.push(node);
        edges.push(edge);
        allNodes.push(node);
    }

    return { nodes, edges };
}
