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

const AUTOSAVE_DELAY_MS = 2000;
const POSITION_SAVE_DELAY_MS = 5000;

/** Serializes workspace-level fields that should trigger auto-save */
function serializeWorkspacePoolFields(workspace: Workspace | null): string {
    if (!workspace) return '';
    return JSON.stringify({ includeAllNodesInPool: workspace.includeAllNodesInPool ?? false });
}

export function useAutosave(workspaceId: string, isWorkspaceLoading: boolean = false) {
    const nodes = useCanvasStore((s) => s.nodes);
    const edges = useCanvasStore((s) => s.edges);
    const currentWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === workspaceId)) ?? null;
    const user = useAuthStore((s) => s.user);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef({ nodes: '', edges: '', workspace: '', positions: '' });
    // Tracks the last workspace state successfully persisted to Firestore.
    // Separate from lastSavedRef.current.workspace (updated pre-save for change detection)
    // so save() correctly detects pool-toggle changes even after the debounce ref is updated.
    const lastPersistedWorkspaceRef = useRef('');

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
            await Promise.all([
                saveNodes(user.id, workspaceId, nodes),
                saveEdges(user.id, workspaceId, edges),
            ]);
            workspaceCache.update(workspaceId, nodes, edges);

            const newNodeCount = nodes.length;
            const nodeCountChanged = currentWorkspace && currentWorkspace.nodeCount !== newNodeCount;
            const currentWorkspaceJson = serializeWorkspacePoolFields(currentWorkspace);
            const workspaceFieldsChanged = lastPersistedWorkspaceRef.current !== currentWorkspaceJson;

            if (currentWorkspace && (nodeCountChanged || workspaceFieldsChanged)) {
                await saveWorkspace(user.id, { ...currentWorkspace, nodeCount: newNodeCount });
                if (nodeCountChanged) {
                    useWorkspaceStore.getState().setNodeCount(workspaceId, newNodeCount);
                }
                lastPersistedWorkspaceRef.current = currentWorkspaceJson;
            }

            setSaved();
        } catch (error) {
            const message = error instanceof Error ? error.message : strings.offline.saveError;
            setError(message);
            toast.error(strings.offline.saveFailed);
        }
    }, [user, workspaceId, nodes, edges, currentWorkspace]);

    useEffect(() => {
        const contentJson = JSON.stringify(
            nodes.map((n) => ({
                id: n.id,
                data: n.data,
                width: n.width,
                height: n.height,
            }))
        );
        const positionJson = JSON.stringify(
            nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }))
        );
        const edgesJson = JSON.stringify(edges);
        const workspaceJson = serializeWorkspacePoolFields(currentWorkspace);

        const contentChanged = contentJson !== lastSavedRef.current.nodes ||
            edgesJson !== lastSavedRef.current.edges ||
            workspaceJson !== lastSavedRef.current.workspace;
        const positionChanged = positionJson !== lastSavedRef.current.positions;

        if (!contentChanged && !positionChanged) return;

        if (isWorkspaceLoading) {
            lastSavedRef.current = {
                nodes: contentJson, edges: edgesJson, workspace: workspaceJson, positions: positionJson,
            };
            lastPersistedWorkspaceRef.current = workspaceJson;
            return;
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const delay = contentChanged ? AUTOSAVE_DELAY_MS : POSITION_SAVE_DELAY_MS;
        timeoutRef.current = setTimeout(() => {
            lastSavedRef.current = {
                nodes: contentJson, edges: edgesJson, workspace: workspaceJson, positions: positionJson,
            };
            void save();
        }, delay);

        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [nodes, edges, currentWorkspace, save, isWorkspaceLoading, workspaceId]);

    // Flush pending save when tab becomes hidden (prevents data loss on close)
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
}
