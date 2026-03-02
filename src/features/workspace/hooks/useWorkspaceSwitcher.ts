/**
 * useWorkspaceSwitcher - Atomic workspace switching with cache-first pattern
 */
import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useCanvasStore, EMPTY_SELECTED_IDS } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { loadNodes, loadEdges } from '../services/workspaceService';
import { workspaceCache } from '../services/workspaceCache';
import { useOfflineQueueStore } from '../stores/offlineQueueStore';
import { loadWorkspaceKB } from '../services/workspaceSwitchHelpers';
import { persistLastWorkspaceId } from '../services/lastWorkspaceService';
import { strings } from '@/shared/localization/strings';

interface UseWorkspaceSwitcherResult {
    isSwitching: boolean;
    error: string | null;
    switchWorkspace: (workspaceId: string) => Promise<void>;
}


export function useWorkspaceSwitcher(): UseWorkspaceSwitcherResult {
    const user = useAuthStore((s) => s.user);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const isSwitching = useWorkspaceStore((s) => s.isSwitching);

    const [error, setError] = useState<string | null>(null);
    const switchingRef = useRef(false);


    const switchWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
        // Guard: same workspace or no user
        if (workspaceId === currentWorkspaceId || !user) {
            return;
        }

        // Guard: prevent concurrent switches
        if (switchingRef.current) {
            return;
        }

        switchingRef.current = true;
        useWorkspaceStore.getState().setSwitching(true);
        setError(null);

        try {
            // 1. Fire-and-forget save (non-blocking, parallel with load)
            const { nodes: currentNodes, edges: currentEdges } = useCanvasStore.getState();
            if (currentWorkspaceId && (currentNodes.length > 0 || currentEdges.length > 0)) {
                useWorkspaceStore.getState().setNodeCount(currentWorkspaceId, currentNodes.length);

                // Use offline queue for reliable saving, even if currently offline
                useOfflineQueueStore.getState().queueSave(user.id, currentWorkspaceId, currentNodes, currentEdges);
            }

            // 2. Check cache first (instant if cached)
            const cached = workspaceCache.get(workspaceId);
            let newNodes;
            let newEdges;

            if (cached) {
                newNodes = cached.nodes;
                newEdges = cached.edges;
            } else {
                [newNodes, newEdges] = await Promise.all([
                    loadNodes(user.id, workspaceId),
                    loadEdges(user.id, workspaceId),
                ]);
                workspaceCache.set(workspaceId, { nodes: newNodes, edges: newEdges, loadedAt: Date.now() });
            }

            // 3. Atomic swap: single setState to prevent cascading re-renders
            useCanvasStore.setState({
                nodes: newNodes,
                edges: newEdges,
                selectedNodeIds: EMPTY_SELECTED_IDS as Set<string>,
            });

            // Phase R3: Sync node count explicitly to UI store
            useWorkspaceStore.getState().setNodeCount(workspaceId, newNodes.length);

            // 4. Update workspace ID last and persist for session restore
            useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceId);
            persistLastWorkspaceId(workspaceId);

            void loadWorkspaceKB(user.id, workspaceId);
        } catch (err) {
            const message = err instanceof Error ? err.message : strings.workspace.switchError;
            setError(message);
            console.error('[useWorkspaceSwitcher]', err);
        } finally {
            useWorkspaceStore.getState().setSwitching(false);
            switchingRef.current = false;
        }
    }, [user, currentWorkspaceId]);

    return { isSwitching, error, switchWorkspace };
}
