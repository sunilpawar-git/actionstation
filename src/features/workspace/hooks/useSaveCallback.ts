/**
 * useSaveCallback - Stable save function with latest-value refs.
 * Refs ensure save() always persists the latest state, avoiding
 * stale closure capture in debounced callbacks.
 */
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { saveNodes, saveEdges, saveWorkspace } from '@/features/workspace/services/workspaceService';
import { workspaceCache } from '@/features/workspace/services/workspaceCache';
import { useSaveStatusStore } from '@/shared/stores/saveStatusStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import type { Workspace } from '@/features/workspace/types/workspace';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';
import { useOfflineQueueStore } from '../stores/offlineQueueStore';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

export function serializeWorkspacePoolFields(workspace: Workspace | null): string {
    if (!workspace) return '';
    return JSON.stringify({ includeAllNodesInPool: workspace.includeAllNodesInPool ?? false });
}

export function useSaveCallback(workspaceId: string) {
    const nodes = useCanvasStore((s) => s.nodes);
    const edges = useCanvasStore((s) => s.edges);
    const workspaces = useWorkspaceStore((s) => s.workspaces);
    const currentWorkspace = useMemo(
        () => workspaces.find((w) => w.id === workspaceId) ?? null,
        [workspaces, workspaceId],
    );
    const user = useAuthStore((s) => s.user);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPersistedWorkspaceRef = useRef('');

    const latestNodesRef = useRef(nodes);
    const latestEdgesRef = useRef(edges);
    const latestWorkspaceRef = useRef(currentWorkspace);
    latestNodesRef.current = nodes;
    latestEdgesRef.current = edges;
    latestWorkspaceRef.current = currentWorkspace;

    const save = useCallback(async () => {
        if (!user || !workspaceId) return;
        const currentNodes = latestNodesRef.current;
        const currentEdges = latestEdgesRef.current;
        const workspace = latestWorkspaceRef.current;

        const isOnline = useNetworkStatusStore.getState().isOnline;
        if (!isOnline) {
            useOfflineQueueStore.getState().queueSave(user.id, workspaceId, currentNodes, currentEdges);
            useSaveStatusStore.getState().setQueued();
            workspaceCache.update(workspaceId, currentNodes, currentEdges);
            return;
        }

        const { setSaving, setSaved, setError } = useSaveStatusStore.getState();
        setSaving();
        try {
            await Promise.all([
                saveNodes(user.id, workspaceId, currentNodes),
                saveEdges(user.id, workspaceId, currentEdges),
            ]);
            workspaceCache.update(workspaceId, currentNodes, currentEdges);

            const newNodeCount = currentNodes.length;
            const nodeCountChanged = workspace && workspace.nodeCount !== newNodeCount;
            const wsJson = serializeWorkspacePoolFields(workspace);
            const wsFieldsChanged = lastPersistedWorkspaceRef.current !== wsJson;

            if (workspace && (nodeCountChanged || wsFieldsChanged)) {
                await saveWorkspace(user.id, { ...workspace, nodeCount: newNodeCount });
                if (nodeCountChanged) {
                    useWorkspaceStore.getState().setNodeCount(workspaceId, newNodeCount);
                }
                lastPersistedWorkspaceRef.current = wsJson;
            }
            setSaved();
        } catch (error) {
            const message = error instanceof Error ? error.message : strings.offline.saveError;
            setError(message);
            toast.error(strings.offline.saveFailed);
        }
    }, [user, workspaceId]);
    useEffect(() => {
        const flush = () => {
            if (document.hidden && timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
                void save();
            }
        };
        document.addEventListener('visibilitychange', flush);
        return () => document.removeEventListener('visibilitychange', flush);
    }, [save]);

    return { save, nodes, edges, currentWorkspace, timeoutRef, lastPersistedWorkspaceRef };
}
