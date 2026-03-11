/**
 * useDoubleClickToCreate — Hook for creating a node on canvas pane double-click.
 *
 * Architecture:
 * - screenToFlowPosition from ReactFlow for coordinate conversion
 * - useAddNode for canonical node creation with undo support
 * - Guards: isCanvasLocked, editingNodeId, pane target check, debounce
 * - Ref-based debounce (lastCreationRef) prevents rapid-fire creation
 *
 * No Zustand subscriptions to nodes/editingNodeId — reads via getState() in callback
 * to avoid re-render cascades and "Maximum update depth exceeded" errors.
 */
import { useCallback, useRef, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../stores/canvasStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useAddNode } from './useAddNode';
import { snapToMasonrySlot } from '../services/snapToMasonrySlot';
import { FOCUS_NODE_EVENT } from './useQuickCapture';
import { useDoubleTap } from '@/shared/hooks/useDoubleTap';

/** Minimum ms between successive double-click creations. */
const MIN_CREATION_INTERVAL_MS = 300;
const FOCUS_DELAY_MS = 50;
const REACT_FLOW_PANE_CLASS = 'react-flow__pane';

/** Return type for the hook — mouse and touch handlers for the pane wrapper. */
export interface PaneDoubleClickHandlers {
    onDoubleClick: (event: React.MouseEvent) => void;
    onTouchEnd: (event: React.TouchEvent) => void;
}

/**
 * Returns double-click and double-tap handlers for the ReactFlow pane wrapper.
 * Creates a new node at the click/tap position (free-flow: exact; masonry: snapped).
 * Emits FOCUS_NODE_EVENT so the new node's heading receives focus.
 * Unified analytics label: 'canvas-double-click' for both mouse and touch.
 */
export function useDoubleClickToCreate(): PaneDoubleClickHandlers {
    const { screenToFlowPosition } = useReactFlow();
    const addNode = useAddNode();
    const lastCreationRef = useRef<number>(0);
    const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup focus timer on unmount to prevent stale dispatches
    useEffect(() => {
        return () => {
            if (focusTimerRef.current !== null) {
                clearTimeout(focusTimerRef.current);
                focusTimerRef.current = null;
            }
        };
    }, []);

    /**
     * Shared creation logic — called by both mouse and touch handlers.
     * @param screenX - Screen X coordinate from the event
     * @param screenY - Screen Y coordinate from the event
     */
    const createNodeAtScreen = useCallback((screenX: number, screenY: number) => {
        // Guard: canvas locked (read at call time — no subscription)
        const isLocked = useSettingsStore.getState().isCanvasLocked;
        if (isLocked) return;

        // Guard: user is editing a node (typing in heading/content)
        const editingNodeId = useCanvasStore.getState().editingNodeId;
        if (editingNodeId) return;

        // Guard: debounce rapid double-clicks
        const now = Date.now();
        if (now - lastCreationRef.current < MIN_CREATION_INTERVAL_MS) return;
        lastCreationRef.current = now;

        // Convert screen coordinates to canvas flow coordinates
        const flowPosition = screenToFlowPosition({ x: screenX, y: screenY });

        // In masonry mode, snap to nearest grid slot
        const isFreeFlow = useSettingsStore.getState().canvasFreeFlow;
        const position = isFreeFlow
            ? flowPosition
            : snapToMasonrySlot(flowPosition, useCanvasStore.getState().nodes);

        // Create the node — addNode handles undo, pan, and fires single analytics event
        const nodeId = addNode({ position, source: 'canvas-double-click' });

        // Focus the new node's heading after a short delay (matches useQuickCapture pattern)
        if (nodeId) {
            focusTimerRef.current = setTimeout(() => {
                window.dispatchEvent(
                    new CustomEvent(FOCUS_NODE_EVENT, { detail: { nodeId } }),
                );
                focusTimerRef.current = null;
            }, FOCUS_DELAY_MS);
        }
    }, [screenToFlowPosition, addNode]);

    const handlePaneDoubleClick = useCallback((event: React.MouseEvent) => {
        // Guard: only fire on the pane background, not on nodes or edges
        const target = event.target as HTMLElement;
        if (!target.classList.contains(REACT_FLOW_PANE_CLASS)) return;
        createNodeAtScreen(event.clientX, event.clientY);
    }, [createNodeAtScreen]);

    const handlePaneDoubleTap = useDoubleTap(useCallback((event: React.TouchEvent) => {
        const target = event.target as HTMLElement;
        if (!target.classList.contains(REACT_FLOW_PANE_CLASS)) return;
        const touch = event.changedTouches[0];
        if (!touch) return;
        createNodeAtScreen(touch.clientX, touch.clientY);
    }, [createNodeAtScreen]));

    return { onDoubleClick: handlePaneDoubleClick, onTouchEnd: handlePaneDoubleTap };
}
