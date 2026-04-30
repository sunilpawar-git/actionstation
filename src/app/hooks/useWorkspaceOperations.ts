/**
 * useWorkspaceOperations Hook - Handles creation, deletion, renaming and reordering
 */
import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useWorkspaceSwitcher } from '@/features/workspace/hooks/useWorkspaceSwitcher';
import { useTierLimits } from '@/features/subscription/hooks/useTierLimits';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import {
    createNewWorkspace, createNewDividerWorkspace,
    saveWorkspace, updateWorkspaceOrder
} from '@/features/workspace/services/workspaceService';
import { useOfflineQueueStore } from '@/features/workspace/stores/offlineQueueStore';
import { logger } from '@/shared/services/logger';
import { instantiateTemplate } from '@/features/templates/services/templateInstantiator';
import { trackTemplateUsed } from '@/shared/services/analyticsService';
import type { LimitCheckResult } from '@/features/subscription/types/tierLimits';
import type { WorkspaceTemplate } from '@/features/templates/types/template';

function flushCurrentWorkspace(userId: string, curId: string): void {
    const { nodes, edges } = useCanvasStore.getState();
    if (nodes.length > 0 || edges.length > 0) {
        useOfflineQueueStore.getState().queueSave(userId, curId, nodes, edges);
        useWorkspaceStore.getState().setNodeCount(curId, nodes.length);
    }
}

function applyTemplateToCanvas(userId: string, workspaceId: string, template: WorkspaceTemplate): void {
    const { nodes: tNodes, edges: tEdges } = instantiateTemplate(template, workspaceId);
    useCanvasStore.getState().setNodes(tNodes);
    useCanvasStore.getState().setEdges(tEdges);
    useOfflineQueueStore.getState().queueSave(userId, workspaceId, tNodes, tEdges);
    trackTemplateUsed(template.id, template.isCustom);
}

async function insertDividerWithOrder(userId: string, divider: Parameters<typeof saveWorkspace>[1], curId: string): Promise<void> {
    useWorkspaceStore.getState().insertWorkspaceAfter(divider, curId);
    const updatedList = useWorkspaceStore.getState().workspaces;
    const insertedIndex = updatedList.findIndex(ws => ws.id === divider.id);
    if (insertedIndex === -1) {
        logger.warn('[useWorkspaceOperations] Divider not found after insert');
    }
    const orderIndex = insertedIndex >= 0 ? insertedIndex : updatedList.length - 1;
    const updates = updatedList.map((ws, i) => ({ id: ws.id, orderIndex: i }));
    await Promise.all([
        saveWorkspace(userId, { ...divider, orderIndex }),
        updateWorkspaceOrder(userId, updates),
    ]);
}

export function useWorkspaceOperations() {
    const user = useAuthStore((s) => s.user);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const workspaces = useWorkspaceStore((s) => s.workspaces);
    const { switchWorkspace } = useWorkspaceSwitcher();
    const { check } = useTierLimits();

    const [isCreating, setIsCreating] = useState(false);
    const [isCreatingDivider, setIsCreatingDivider] = useState(false);
    const [upgradeWall, setUpgradeWall] = useState<LimitCheckResult | null>(null);
    const userRef = useRef(user);
    const currentIdRef = useRef(currentWorkspaceId);
    userRef.current = user;
    currentIdRef.current = currentWorkspaceId;

    const dismissWall = useCallback(() => setUpgradeWall(null), []);

    const handleNewWorkspace = useCallback(async (template: WorkspaceTemplate | null = null) => {
        const currentUser = userRef.current;
        if (!currentUser || isCreating) return;

        // Free tier workspace limit guard
        const wsCheck = check('workspace');
        if (!wsCheck.allowed) { setUpgradeWall(wsCheck); return; }

        setIsCreating(true);
        try {
            const curId = currentIdRef.current;
            if (curId) { flushCurrentWorkspace(currentUser.id, curId); }
            const workspace = await createNewWorkspace(currentUser.id);
            useWorkspaceStore.getState().addWorkspace({ ...workspace, nodeCount: 0 });
            useWorkspaceStore.getState().setCurrentWorkspaceId(workspace.id);
            useCanvasStore.getState().clearCanvas();
            if (template) {
                applyTemplateToCanvas(currentUser.id, workspace.id, template);
            }
            toast.success(`${strings.workspace.created}: ${workspace.name}`);
        } catch (error) {
            logger.error('[Sidebar] Failed to create workspace:', error);
            toast.error(strings.errors.generic);
        } finally { setIsCreating(false); }
    }, [isCreating, check]); // stable — user/currentId read via refs

    const handleNewDivider = useCallback(async () => {
        const currentUser = userRef.current;
        if (!currentUser || isCreatingDivider) return;
        setIsCreatingDivider(true);
        try {
            const curId = currentIdRef.current;
            const newDivider = await createNewDividerWorkspace(currentUser.id);
            if (curId) {
                await insertDividerWithOrder(currentUser.id, newDivider, curId);
            } else { useWorkspaceStore.getState().addWorkspace(newDivider); }
            toast.success(strings.workspace.addDivider);
        } catch (error) {
            logger.error('[Sidebar] Failed to create divider:', error);
            toast.error(strings.errors.generic);
        } finally { setIsCreatingDivider(false); }
    }, [isCreatingDivider]); // stable — user/currentId read via refs

    return {
        isCreating,
        isCreatingDivider,
        handleNewWorkspace,
        handleNewDivider,
        upgradeWall,
        dismissWall,
        workspaces,
        currentWorkspaceId,
        updateWorkspace: useWorkspaceStore.getState().updateWorkspace,
        reorderWorkspaces: useWorkspaceStore.getState().reorderWorkspaces,
        removeWorkspace: useWorkspaceStore.getState().removeWorkspace,
        switchWorkspace,
        user,
    };
}
