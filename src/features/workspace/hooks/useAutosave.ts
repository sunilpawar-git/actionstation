/**
 * useAutosave Hook - Debounced autosave with offline queue support
 */
import { useEffect, useRef, useCallback } from 'react';
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

const AUTOSAVE_DELAY_MS = 2000; // 2 second debounce


/** Serializes workspace-level fields that should trigger auto-save */
function serializeWorkspacePoolFields(workspaces: Workspace[], workspaceId: string): string {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) return '';
    return JSON.stringify({ includeAllNodesInPool: ws.includeAllNodesInPool ?? false });
}

export function useAutosave(workspaceId: string, isWorkspaceLoading: boolean = false) {
    const nodes = useCanvasStore((s) => s.nodes);
    const edges = useCanvasStore((s) => s.edges);
    const workspaces = useWorkspaceStore((s) => s.workspaces);
    const user = useAuthStore((s) => s.user);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef({ nodes: '', edges: '', workspace: '' });

    const save = useCallback(async () => {
        if (!user || !workspaceId) return;

        const isOnline = useNetworkStatusStore.getState().isOnline;

        // Offline: queue save for later
        if (!isOnline) {
            useOfflineQueueStore.getState().queueSave(user.id, workspaceId, nodes, edges);
            useSaveStatusStore.getState().setQueued();
            workspaceCache.update(workspaceId, nodes, edges);
            return;
        }

        // Online: save directly to Firestore
        const { setSaving, setSaved, setError } = useSaveStatusStore.getState();
        setSaving();

        try {
            const currentWorkspace = useWorkspaceStore.getState().workspaces.find((w) => w.id === workspaceId);

            await Promise.all([
                saveNodes(user.id, workspaceId, nodes),
                saveEdges(user.id, workspaceId, edges),
            ]);
            workspaceCache.update(workspaceId, nodes, edges);

            const newNodeCount = nodes.length;
            const nodeCountChanged = currentWorkspace && currentWorkspace.nodeCount !== newNodeCount;
            const workspaceFieldsChanged = lastSavedRef.current.workspace !==
                serializeWorkspacePoolFields(useWorkspaceStore.getState().workspaces, workspaceId);

            if (currentWorkspace && (nodeCountChanged || workspaceFieldsChanged)) {
                await saveWorkspace(user.id, { ...currentWorkspace, nodeCount: newNodeCount });
                if (nodeCountChanged) {
                    useWorkspaceStore.getState().setNodeCount(workspaceId, newNodeCount);
                }
            }

            setSaved();
        } catch (error) {
            const message = error instanceof Error ? error.message : strings.offline.saveError;
            setError(message);
            toast.error(strings.offline.saveFailed);
        }
    }, [user, workspaceId, nodes, edges]);

    useEffect(() => {
        const nodesJson = JSON.stringify(
            nodes.map((n) => ({
                id: n.id,
                data: n.data,
                width: n.width,
                height: n.height,
            }))
        );
        const edgesJson = JSON.stringify(edges);
        const workspaceJson = serializeWorkspacePoolFields(workspaces, workspaceId);

        if (
            nodesJson === lastSavedRef.current.nodes &&
            edgesJson === lastSavedRef.current.edges &&
            workspaceJson === lastSavedRef.current.workspace
        ) {
            return;
        }

        if (isWorkspaceLoading) {
            lastSavedRef.current = { nodes: nodesJson, edges: edgesJson, workspace: workspaceJson };
            return;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            lastSavedRef.current = { nodes: nodesJson, edges: edgesJson, workspace: workspaceJson };
            void save();
        }, AUTOSAVE_DELAY_MS);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [nodes, edges, workspaces, save, isWorkspaceLoading, workspaceId]);
}
