/**
 * Node Clone Utilities — Shared deep-clone logic for duplicate and share.
 * Strips transient state, sanitises for Firestore, and produces a typed CanvasNode.
 * Single source of truth: any new transient field to reset goes here.
 */
import { removeUndefined } from '@/shared/utils/firebaseUtils';
import { generateUUID } from '@/shared/utils/uuid';
import type { CanvasNode, IdeaNodeData, NodePosition } from '../types/node';

interface CloneOverrides {
    workspaceId?: string;
    position: NodePosition;
}

/**
 * Deep-clones a node's data, stripping calendar events and resetting generation state.
 */
function cloneNodeData(source: IdeaNodeData): IdeaNodeData {
    const cloned = structuredClone(source);
    delete cloned.calendarEvent;
    cloned.isGenerating = false;
    cloned.isPromptCollapsed = false;
    cloned.isPinned = false;
    return cloned;
}

/**
 * Builds a fully typed, Firestore-safe CanvasNode clone from a source node.
 *
 * @param source - The original node
 * @param overrides - workspaceId (defaults to source) and position (required)
 */
export function buildClonedNode(source: CanvasNode, overrides: CloneOverrides): CanvasNode {
    const data = cloneNodeData(source.data);
    const now = new Date();

    const node: CanvasNode = {
        id: `idea-${generateUUID()}`,
        workspaceId: overrides.workspaceId ?? source.workspaceId,
        type: source.type,
        data: removeUndefined(data as Record<string, unknown>) as IdeaNodeData,
        position: overrides.position,
        width: source.width,
        height: source.height,
        createdAt: now,
        updatedAt: now,
    };

    return removeUndefined(node as unknown as Record<string, unknown>) as unknown as CanvasNode;
}
