/**
 * canvasStoreActions — Action factory functions for the canvas Zustand store.
 * Each factory receives (set, get) and returns a group of related actions.
 * Keeps canvasStore.ts under the 300-line limit by separating action logic.
 */
import type { Viewport } from '@xyflow/react';
import type { CanvasNode, IdeaNodeData, LinkPreviewMetadata, NodeColorKey } from '../types/node';
import type { CalendarEventMetadata } from '@/features/calendar/types/calendarEvent';
import type { InputMode } from '../types/slashCommand';
import type { CanvasEdge } from '../types/edge';
import {
    updateNodeDimensionsInArray,
    updateNodeDataField,
    appendToNodeOutputInArray,
    togglePromptCollapsedInArray,
    deleteNodeFromArrays,
    getConnectedNodeIds,
    getUpstreamNodesFromArrays,
    arrangeNodesInGrid,
    arrangeNodesAfterResize,
    toggleNodePinnedInArray,
    toggleNodeCollapsedInArray,
    toggleNodePoolInArray,
    clearAllNodePoolInArray,
    setNodeColorInArray,
} from './canvasStoreHelpers';
import { duplicateNode as cloneNode } from '../services/nodeDuplicationService';
import { EMPTY_SELECTED_IDS, getNodeMap } from './canvasStoreUtils';
import type { CanvasStore } from './canvasStore';

type SetFn = (partial: Partial<CanvasStore> | ((s: CanvasStore) => Partial<CanvasStore>)) => void;
type GetFn = () => CanvasStore;

// ---------------------------------------------------------------------------
// Node mutation actions (structural: add, duplicate, delete, bulk)
// ---------------------------------------------------------------------------

export function createNodeMutationActions(set: SetFn, get: GetFn) {
    return {
        addNode: (node: CanvasNode) => set((s) => ({ nodes: [...s.nodes, node] })),

        duplicateNode: (nodeId: string): string | undefined => {
            const nodes = get().nodes;
            const node = getNodeMap(nodes).get(nodeId);
            if (!node) return undefined;
            const newNode = cloneNode(node, nodes);
            set((s) => ({ nodes: [...s.nodes, newNode] }));
            return newNode.id;
        },

        updateNodeDimensions: (nodeId: string, width: number, height: number) =>
            set((s) => ({ nodes: updateNodeDimensionsInArray(s.nodes, nodeId, width, height) })),

        updateNodeContent: (nodeId: string, content: string) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'content', content) })),

        deleteNode: (nodeId: string) => {
            set((s) => ({
                ...deleteNodeFromArrays(s.nodes, s.edges, s.selectedNodeIds, nodeId),
                ...(s.editingNodeId === nodeId
                    ? { editingNodeId: null, draftContent: null, inputMode: 'note' as const }
                    : {}),
            }));
            const state = get();
            if (state.clusterGroups.length > 0) {
                state.pruneDeletedNodes(new Set(state.nodes.map((n) => n.id)));
            }
        },

        setNodes: (nodes: CanvasNode[]) => set({ nodes }),

        clearCanvas: () => set({
            nodes: [], edges: [], selectedNodeIds: EMPTY_SELECTED_IDS as Set<string>,
            viewport: { x: 32, y: 32, zoom: 1 },
            editingNodeId: null, draftContent: null, inputMode: 'note',
            clusterGroups: [],
        }),
    };
}

// ---------------------------------------------------------------------------
// Node data actions (field updates, toggles, flags)
// ---------------------------------------------------------------------------

export function createNodeDataActions(set: SetFn) {
    return {
        updateNodeHeading: (nodeId: string, heading: string) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'heading', heading) })),

        updateNodePrompt: (nodeId: string, prompt: string) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'prompt', prompt) })),

        updateNodeOutput: (nodeId: string, output: string) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'output', output) })),

        updateNodeTags: (nodeId: string, tags: string[]) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'tags', tags) })),

        updateNodeAttachments: (nodeId: string, attachments: IdeaNodeData['attachments']) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'attachments', attachments) })),

        updateNodeColor: (nodeId: string, colorKey: NodeColorKey) =>
            set((s) => ({ nodes: setNodeColorInArray(s.nodes, nodeId, colorKey) })),

        appendToNodeOutput: (nodeId: string, chunk: string) =>
            set((s) => ({ nodes: appendToNodeOutputInArray(s.nodes, nodeId, chunk) })),

        setNodeGenerating: (nodeId: string, isGenerating: boolean) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'isGenerating', isGenerating) })),

        togglePromptCollapsed: (nodeId: string) =>
            set((s) => ({ nodes: togglePromptCollapsedInArray(s.nodes, nodeId) })),

        toggleNodePinned: (nodeId: string) =>
            set((s) => ({ nodes: toggleNodePinnedInArray(s.nodes, nodeId) })),

        toggleNodeCollapsed: (nodeId: string) =>
            set((s) => ({ nodes: toggleNodeCollapsedInArray(s.nodes, nodeId) })),

        toggleNodePoolMembership: (nodeId: string) =>
            set((s) => ({ nodes: toggleNodePoolInArray(s.nodes, nodeId) })),

        clearAllNodePool: () =>
            set((s) => ({ nodes: clearAllNodePoolInArray(s.nodes) })),

        setNodeCalendarEvent: (nodeId: string, event: CalendarEventMetadata | undefined) =>
            set((s) => ({ nodes: updateNodeDataField(s.nodes, nodeId, 'calendarEvent', event) })),
    };
}

// ---------------------------------------------------------------------------
// Edge, layout, and query actions
// ---------------------------------------------------------------------------

export function createEdgeAndLayoutActions(set: SetFn, get: GetFn) {
    return {
        addEdge: (edge: CanvasEdge) => set((s) => ({ edges: [...s.edges, edge] })),

        deleteEdge: (edgeId: string) =>
            set((s) => ({ edges: s.edges.filter((e) => e.id !== edgeId) })),

        setEdges: (edges: CanvasEdge[]) => set({ edges }),

        arrangeNodes: () => set((s) => ({ nodes: arrangeNodesInGrid(s.nodes) })),

        arrangeAfterResize: (nodeId: string) =>
            set((s) => ({ nodes: arrangeNodesAfterResize(s.nodes, nodeId) })),

        setViewport: (viewport: Viewport) => set({ viewport }),

        getConnectedNodes: (nodeId: string) => getConnectedNodeIds(get().edges, nodeId),

        getUpstreamNodes: (nodeId: string) => {
            const { nodes, edges } = get();
            return getUpstreamNodesFromArrays(nodes, edges, nodeId);
        },
    };
}

// ---------------------------------------------------------------------------
// Selection actions (decoupled from nodes array for performance)
// ---------------------------------------------------------------------------

export function createSelectionActions(set: SetFn, get: GetFn) {
    return {
        selectNode: (nodeId: string) =>
            set((s) => ({ selectedNodeIds: new Set([...s.selectedNodeIds, nodeId]) })),

        deselectNode: (nodeId: string) =>
            set((s) => {
                const newSet = new Set(s.selectedNodeIds);
                newSet.delete(nodeId);
                return { selectedNodeIds: newSet };
            }),

        clearSelection: () => {
            if (get().selectedNodeIds.size === 0) return;
            set({ selectedNodeIds: EMPTY_SELECTED_IDS as Set<string> });
        },
    };
}

// ---------------------------------------------------------------------------
// Editing state actions
// ---------------------------------------------------------------------------

export function createEditingActions(set: SetFn, get: GetFn) {
    return {
        startEditing: (nodeId: string) => {
            if (get().editingNodeId === nodeId) return;
            set({ editingNodeId: nodeId, draftContent: null, inputMode: 'note' });
        },

        stopEditing: () => {
            const s = get();
            if (s.editingNodeId === null && s.draftContent === null && s.inputMode === 'note') return;
            set({ editingNodeId: null, draftContent: null, inputMode: 'note' });
        },

        updateDraft: (content: string) => set({ draftContent: content }),

        setInputMode: (mode: InputMode) => set({ inputMode: mode }),
    };
}

// ---------------------------------------------------------------------------
// Link preview actions
// ---------------------------------------------------------------------------

export function createLinkPreviewActions(set: SetFn) {
    return {
        addLinkPreview: (nodeId: string, url: string, metadata: LinkPreviewMetadata) =>
            set((s) => ({
                nodes: s.nodes.map((node) =>
                    node.id === nodeId
                        ? {
                            ...node,
                            data: {
                                ...node.data,
                                linkPreviews: { ...node.data.linkPreviews, [url]: metadata },
                            },
                            updatedAt: new Date(),
                        }
                        : node
                ),
            })),

        removeLinkPreview: (nodeId: string, url: string) =>
            set((s) => ({
                nodes: s.nodes.map((node) => {
                    if (node.id !== nodeId) return node;
                    const { [url]: _, ...rest } = node.data.linkPreviews ?? {};
                    return {
                        ...node,
                        data: { ...node.data, linkPreviews: rest },
                        updatedAt: new Date(),
                    };
                }),
            })),
    };
}
