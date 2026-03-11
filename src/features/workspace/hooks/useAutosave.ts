/**
 * useAutosave Hook - Debounce scheduling for autosave
 * Delegates save logic to useSaveCallback; handles change detection and timing.
 *
 * Performance: uses reference-based dirty tracking for nodes/edges (O(1) vs
 * O(N) JSON.stringify). Workspace field comparison remains fingerprint-based
 * since the workspace object is small. JSON.stringify on nodes/edges only runs
 * inside the debounced timeout callback (every 2s), not on every mutation.
 *
 * Stale-closure prevention: the setTimeout callback reads from refs (not the
 * closed-over variables) to ensure the fingerprint always reflects the latest
 * state at fire time, not the state when the timeout was scheduled.
 */
import { useEffect, useRef } from 'react';
import { useSaveCallback, serializeWorkspacePoolFields } from './useSaveCallback';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

const AUTOSAVE_DELAY_MS = 2000;

export function useAutosave(workspaceId: string, isWorkspaceLoading: boolean = false) {
    const {
        save, nodes, edges, currentWorkspace,
        timeoutRef, lastPersistedWorkspaceRef,
    } = useSaveCallback(workspaceId);

    const prevNodesRef = useRef<CanvasNode[] | null>(null);
    const prevEdgesRef = useRef<CanvasEdge[] | null>(null);
    const prevWorkspaceJsonRef = useRef('');
    const lastSavedRef = useRef<Fingerprint | null>(null);
    const prevLoadingRef = useRef(isWorkspaceLoading);
    const prevWsIdRef = useRef(workspaceId);

    if (workspaceId !== prevWsIdRef.current) {
        prevNodesRef.current = null;
        prevEdgesRef.current = null;
        prevWorkspaceJsonRef.current = '';
        lastSavedRef.current = null;
        prevLoadingRef.current = isWorkspaceLoading;
        prevWsIdRef.current = workspaceId;
    }

    useEffect(() => {
        const nodesChanged = nodes !== prevNodesRef.current;
        const edgesChanged = edges !== prevEdgesRef.current;
        const wsJson = serializeWorkspacePoolFields(currentWorkspace);
        const workspaceChanged = wsJson !== prevWorkspaceJsonRef.current;
        const justFinishedLoading = prevLoadingRef.current && !isWorkspaceLoading;

        prevNodesRef.current = nodes;
        prevEdgesRef.current = edges;
        prevWorkspaceJsonRef.current = wsJson;
        prevLoadingRef.current = isWorkspaceLoading;

        const dirty = nodesChanged || edgesChanged || workspaceChanged || justFinishedLoading;
        if (!dirty) return;

        if (isWorkspaceLoading) {
            const loadTimer = setTimeout(() => {
                const fp = buildFingerprint(
                    prevNodesRef.current ?? [],
                    prevEdgesRef.current ?? [],
                    prevWorkspaceJsonRef.current,
                );
                lastSavedRef.current = fp;
                lastPersistedWorkspaceRef.current = fp.workspace;
            }, 0);
            return () => clearTimeout(loadTimer);
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            const fp = buildFingerprint(
                prevNodesRef.current ?? [],
                prevEdgesRef.current ?? [],
                prevWorkspaceJsonRef.current,
            );
            if (lastSavedRef.current && isIdentical(fp, lastSavedRef.current)) return;
            lastSavedRef.current = fp;
            void save();
        }, AUTOSAVE_DELAY_MS);

        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    // timeoutRef, lastPersistedWorkspaceRef, prevLoadingRef, prevWsIdRef are stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges, currentWorkspace, save, isWorkspaceLoading, workspaceId]);
}

interface Fingerprint { nodes: string; edges: string; workspace: string; positions: string }

function buildFingerprint(
    nodes: CanvasNode[], edges: CanvasEdge[], workspaceJson: string,
): Fingerprint {
    return {
        nodes: JSON.stringify(nodes.map((n) => ({ id: n.id, data: n.data, width: n.width, height: n.height }))),
        edges: JSON.stringify(edges.map((e) => ({ id: e.id, s: e.sourceNodeId, t: e.targetNodeId, r: e.relationshipType }))),
        workspace: workspaceJson,
        positions: JSON.stringify(nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }))),
    };
}

function isIdentical(a: Fingerprint, b: Fingerprint): boolean {
    return a.nodes === b.nodes && a.edges === b.edges
        && a.workspace === b.workspace && a.positions === b.positions;
}
