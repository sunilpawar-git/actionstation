/**
 * Canvas Store - ViewModel for canvas state (nodes, edges, selection)
 * Performance: Selection state decoupled from nodes array.
 * Action factories live in canvasStoreActions.ts to stay under 300-line limit.
 */
import { create } from 'zustand';
import type { Viewport } from '@xyflow/react';
import type { CanvasNode, IdeaNodeData, LinkPreviewMetadata, NodeColorKey } from '../types/node';
import type { CalendarEventMetadata } from '@/features/calendar/types/calendarEvent';
import type { InputMode } from '../types/slashCommand';
import type { CanvasEdge } from '../types/edge';
import {
    createNodeMutationActions,
    createNodeDataActions,
    createEdgeAndLayoutActions,
    createSelectionActions,
    createEditingActions,
    createLinkPreviewActions,
} from './canvasStoreActions';
import { createClusterSlice, type ClusterSlice } from '@/features/clustering/stores/clusterSlice';

import { EMPTY_SELECTED_IDS, getNodeMap } from './canvasStoreUtils';

// Re-export for backward compatibility (importers reference canvasStore.ts as entry point)
export { EMPTY_SELECTED_IDS, getNodeMap };

interface CanvasState {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    selectedNodeIds: Set<string>;
    viewport: Viewport;

    // Editing state (SSOT — only one node editable at a time)
    editingNodeId: string | null;
    draftContent: string | null;
    inputMode: InputMode;
}

interface CanvasActions {
    // Node actions
    addNode: (node: CanvasNode) => void;
    duplicateNode: (nodeId: string) => string | undefined;
    updateNodeDimensions: (nodeId: string, width: number, height: number) => void;
    updateNodeContent: (nodeId: string, content: string) => void;
    deleteNode: (nodeId: string) => void;

    // IdeaNode-specific actions
    updateNodeHeading: (nodeId: string, heading: string) => void;
    updateNodePrompt: (nodeId: string, prompt: string) => void;
    updateNodeOutput: (nodeId: string, output: string) => void;
    updateNodeTags: (nodeId: string, tags: string[]) => void;
    updateNodeAttachments: (nodeId: string, attachments: IdeaNodeData['attachments']) => void;
    updateNodeColor: (nodeId: string, colorKey: NodeColorKey) => void;
    appendToNodeOutput: (nodeId: string, chunk: string) => void;
    setNodeGenerating: (nodeId: string, isGenerating: boolean) => void;
    togglePromptCollapsed: (nodeId: string) => void;
    toggleNodePinned: (nodeId: string) => void;
    toggleNodeCollapsed: (nodeId: string) => void;
    toggleNodePoolMembership: (nodeId: string) => void;
    clearAllNodePool: () => void;

    // Edge actions
    addEdge: (edge: CanvasEdge) => void;
    deleteEdge: (edgeId: string) => void;

    // Layout actions
    arrangeNodes: () => void;
    arrangeAfterResize: (nodeId: string) => void;

    // Selection actions (decoupled for performance)
    selectNode: (nodeId: string) => void;
    deselectNode: (nodeId: string) => void;
    clearSelection: () => void;

    // Queries
    getConnectedNodes: (nodeId: string) => string[];
    getUpstreamNodes: (nodeId: string) => CanvasNode[];

    // Bulk operations
    setNodes: (nodes: CanvasNode[]) => void;
    setEdges: (edges: CanvasEdge[]) => void;
    clearCanvas: () => void;

    // Viewport actions
    setViewport: (viewport: Viewport) => void;

    // Editing state actions (SSOT for "who is editing")
    startEditing: (nodeId: string) => void;
    stopEditing: () => void;
    updateDraft: (content: string) => void;
    setInputMode: (mode: InputMode) => void;

    // Link preview actions
    addLinkPreview: (nodeId: string, url: string, metadata: LinkPreviewMetadata) => void;
    removeLinkPreview: (nodeId: string, url: string) => void;

    // Calendar event actions
    setNodeCalendarEvent: (nodeId: string, event: CalendarEventMetadata | undefined) => void;
}

export type CanvasStore = CanvasState & CanvasActions & ClusterSlice;

const initialState: CanvasState = {
    nodes: [],
    edges: [],
    selectedNodeIds: EMPTY_SELECTED_IDS as Set<string>,
    viewport: { x: 32, y: 32, zoom: 1 },
    editingNodeId: null,
    draftContent: null,
    inputMode: 'note',
};

export const useCanvasStore = create<CanvasStore>()((set, get) => ({
    ...initialState,
    ...createNodeMutationActions(set, get),
    ...createNodeDataActions(set),
    ...createEdgeAndLayoutActions(set, get),
    ...createSelectionActions(set, get),
    ...createEditingActions(set, get),
    ...createLinkPreviewActions(set),
    ...createClusterSlice(set),
}));
