/**
 * Synthesis Node Factory — constructs synthesis CanvasNodes and their edges.
 * Wraps createIdeaNode/createEdge with synthesis-specific fields.
 */
import { createIdeaNode } from '@/features/canvas/types/node';
import { createEdge } from '@/features/canvas/types/edge';
import type { CanvasNode, NodePosition } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import type { SynthesisMode } from './synthesisPrompts';
import { generateUUID } from '@/shared/utils/uuid';

interface CreateSynthesisNodeParams {
    readonly workspaceId: string;
    readonly position: NodePosition;
    readonly heading: string;
    readonly output: string;
    readonly sourceNodeIds: readonly string[];
    readonly mode: SynthesisMode;
}

export function createSynthesisNode(params: CreateSynthesisNodeParams): CanvasNode {
    const id = `idea-${generateUUID()}`;
    const baseNode = createIdeaNode(id, params.workspaceId, params.position);

    return {
        ...baseNode,
        data: {
            ...baseNode.data,
            heading: params.heading,
            output: params.output,
            colorKey: 'synthesis',
            synthesisSourceIds: [...params.sourceNodeIds],
            synthesisMode: params.mode,
        },
    };
}

export function createSynthesisEdges(
    workspaceId: string,
    rootNodeIds: readonly string[],
    synthesisNodeId: string
): CanvasEdge[] {
    return rootNodeIds.map((sourceId) =>
        createEdge(
            `edge-${generateUUID()}`,
            workspaceId,
            sourceId,
            synthesisNodeId,
            'derived'
        )
    );
}
