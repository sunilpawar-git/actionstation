/**
 * Canvas View - ReactFlow wrapper component
 * Store is the single source of truth, ReactFlow syncs to it
 */
import { useMemo, useRef, useReducer, memo, useEffect, useCallback } from 'react';
import { ReactFlow, Background, BackgroundVariant, ConnectionLineType, SelectionMode, PanOnScrollMode, type Node, type Viewport } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../stores/canvasStore';
import { useFocusStore } from '../stores/focusStore';
import { useWorkspaceContext } from '@/app/contexts/WorkspaceContext';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { workspaceCache } from '@/features/workspace/services/workspaceCache';
import { ZoomControls } from './ZoomControls';
import { FocusOverlay } from './FocusOverlay';
import { ViewportSync } from './ViewportSync';
import { SelectionToolbar } from '@/features/synthesis/components/SelectionToolbar';
import { buildRfNodes, cleanupDataShells, type PrevRfNodes } from './buildRfNodes';
import { mapCanvasEdgesToRfEdges, applyPositionAndRemoveChanges } from './canvasChangeHelpers';
import { nodeTypes, edgeTypes, DEFAULT_EDGE_OPTIONS, SNAP_GRID } from './canvasViewConstants';
import { useCanvasHandlers } from '../hooks/useCanvasHandlers';
import { dragPositionReducer, INITIAL_DRAG_STATE } from '../hooks/dragPositionReducer';
import styles from './CanvasView.module.css';

function getContainerClassName(isSwitching: boolean): string {
    return isSwitching ? `${styles.canvasContainer ?? ''} ${styles.switching ?? ''}` : (styles.canvasContainer ?? '');
}

function commitOverridesToStore(
    overrides: ReadonlyMap<string, { x: number; y: number }>,
    dispatch: React.Dispatch<{ type: 'RESET' }>,
): void {
    if (overrides.size === 0) return;
    useCanvasStore.setState((state) => {
        const changes = Array.from(overrides, ([id, position]) => ({
            type: 'position' as const, id, position,
        }));
        const result = applyPositionAndRemoveChanges(state.nodes, changes);
        return result !== state.nodes ? { nodes: result } : {};
    });
    dispatch({ type: 'RESET' });
}

function CanvasViewInner() {
    const nodes = useCanvasStore((s) => s.nodes);
    const edges = useCanvasStore((s) => s.edges);
    const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
    const viewport = useCanvasStore((s) => s.viewport);
    const { currentWorkspaceId, isSwitching } = useWorkspaceContext();
    const canvasGrid = useSettingsStore((s) => s.canvasGrid);
    const canvasScrollMode = useSettingsStore((s) => s.canvasScrollMode);
    const isCanvasLocked = useSettingsStore((s) => s.isCanvasLocked);
    const isFocused = useFocusStore((s) => s.focusedNodeId !== null);
    const isInteractionDisabled = isCanvasLocked || isFocused;
    const isNavigateMode = canvasScrollMode === 'navigate';

    const prevRfNodesRef = useRef<PrevRfNodes>({ arr: [], map: new Map() });
    const [dragState, dragDispatch] = useReducer(dragPositionReducer, INITIAL_DRAG_STATE);
    const handlers = useCanvasHandlers(currentWorkspaceId, isCanvasLocked, dragDispatch);

    const overridesRef = useRef(dragState.overrides);
    overridesRef.current = dragState.overrides;
    const commitDragOverrides = useCallback(
        () => commitOverridesToStore(overridesRef.current, dragDispatch),
        [], // stable: reads only from overridesRef (a ref, not a reactive value)
    );

    const handleMoveEnd = useCallback((_event: unknown, newViewport: Viewport) => {
        useCanvasStore.getState().setViewport(newViewport);
        if (!currentWorkspaceId) return;
        const cached = workspaceCache.get(currentWorkspaceId);
        if (cached) {
            workspaceCache.set(currentWorkspaceId, { ...cached, viewport: newViewport });
        }
    }, [currentWorkspaceId]);

    const rfNodes: Node[] = useMemo(
        () => buildRfNodes(nodes, selectedNodeIds, prevRfNodesRef, dragState.overrides),
        [nodes, selectedNodeIds, dragState.overrides],
    );

    const rfEdges = useMemo(() => mapCanvasEdgesToRfEdges(edges), [edges]);

    useEffect(() => {
        cleanupDataShells(new Set(nodes.map((n) => n.id)));
    }, [nodes]);

    return (
        <div className={getContainerClassName(isSwitching)} data-canvas-container>
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={handlers.onNodesChange}
                onEdgesChange={handlers.onEdgesChange}
                onConnect={handlers.onConnect}
                onSelectionChange={handlers.onSelectionChange}
                onNodeDragStop={commitDragOverrides}
                onSelectionDragStop={commitDragOverrides}
                onMoveEnd={handleMoveEnd}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionLineType={ConnectionLineType.Bezier}
                defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
                snapToGrid
                snapGrid={SNAP_GRID}
                minZoom={0.1}
                maxZoom={2}
                zoomOnScroll={!isInteractionDisabled && !isNavigateMode}
                panOnScroll={!isInteractionDisabled && isNavigateMode}
                panOnDrag={isInteractionDisabled ? false : [1, 2]}
                nodesDraggable={!isInteractionDisabled}
                noDragClassName="nodrag"
                elementsSelectable={!isInteractionDisabled}
                nodesConnectable={!isInteractionDisabled}
                {...(isNavigateMode && { panOnScrollMode: PanOnScrollMode.Free })}
                selectionOnDrag={!isInteractionDisabled}
                selectionMode={SelectionMode.Partial}
                panActivationKeyCode="Space"
                multiSelectionKeyCode="Shift"
            >
                <ViewportSync viewport={viewport} />
                {canvasGrid && <Background variant={BackgroundVariant.Dots} gap={16} size={1} />}
                <ZoomControls />
            </ReactFlow>
            <SelectionToolbar />
            <FocusOverlay />
        </div>
    );
}

export const CanvasView = memo(CanvasViewInner);
