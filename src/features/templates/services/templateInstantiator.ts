/**
 * templateInstantiator — pure function that converts a WorkspaceTemplate into
 * real CanvasNodes + CanvasEdges with fresh UUIDs.
 * No side effects. No store access. No Firestore.
 */
import type { WorkspaceTemplate } from '../types/template';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '@/features/canvas/types/node';

export interface InstantiatedTemplate {
    readonly nodes: CanvasNode[];
    readonly edges: CanvasEdge[];
}

export function instantiateTemplate(
    template: WorkspaceTemplate,
    workspaceId: string,
): InstantiatedTemplate {
    const idMap = new Map<string, string>();
    for (const tNode of template.nodes) {
        idMap.set(tNode.templateId, `idea-${crypto.randomUUID()}`);
    }

    const now = new Date();

    const nodes: CanvasNode[] = template.nodes.map((tNode) => {
        const id = idMap.get(tNode.templateId);
        if (id === undefined) {
            throw new Error(`Template integrity error: missing ID mapping for "${tNode.templateId}"`);
        }
        return {
            id,
            type: 'idea' as const,
            position: tNode.position,
            workspaceId,
            createdAt: now,
            updatedAt: now,
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
            data: {
                heading: tNode.heading,
                output: tNode.output,
                tags: [],
                colorKey: tNode.colorKey,
            },
        };
    });

    // Drop edges whose endpoints don't resolve — defensive against corrupt templates
    const edges: CanvasEdge[] = template.edges.flatMap((tEdge): CanvasEdge[] => {
        const sourceNodeId = idMap.get(tEdge.sourceTemplateId);
        const targetNodeId = idMap.get(tEdge.targetTemplateId);
        if (sourceNodeId === undefined || targetNodeId === undefined) return [];
        return [{
            id: `edge-${crypto.randomUUID()}`,
            workspaceId,
            sourceNodeId,
            targetNodeId,
            relationshipType: 'related' as const,
        }];
    });

    return { nodes, edges };
}
