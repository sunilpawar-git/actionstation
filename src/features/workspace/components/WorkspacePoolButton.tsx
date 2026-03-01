/**
 * WorkspacePoolButton — Toggles "use ALL nodes as AI context" for the current workspace.
 * Renders BrainIcon with active/inactive state and pooled node count tooltip.
 * Uses scalar selectors to avoid re-renders during drag operations.
 */
import { useCallback, useMemo } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { BrainIcon } from '@/shared/components/icons';
import { PoolPreviewBadge } from '@/features/ai/components/PoolPreviewBadge';
import { strings } from '@/shared/localization/strings';
import styles from './WorkspaceControls.module.css';

const POOL_ACTIVE_STYLE = { color: 'var(--color-pool-active)' } as const;

export function WorkspacePoolButton() {
    const workspaces = useWorkspaceStore((s) => s.workspaces);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const nodeCount = useCanvasStore((s) => s.nodes.length);
    const individualPoolCount = useCanvasStore(
        (s) => s.nodes.reduce((n, node) => n + (node.data.includeInAIPool ? 1 : 0), 0),
    );

    const isPooled = useMemo(
        () => workspaces.find((w) => w.id === currentWorkspaceId)?.includeAllNodesInPool ?? false,
        [workspaces, currentWorkspaceId],
    );

    const pooledCount = isPooled ? nodeCount : individualPoolCount;

    const handleToggle = useCallback(() => {
        if (!currentWorkspaceId) return;
        useWorkspaceStore.getState().toggleWorkspacePool(currentWorkspaceId);
    }, [currentWorkspaceId]);

    const tooltipText = isPooled
        ? strings.nodePool.workspacePoolOn
        : strings.nodePool.workspacePoolOff;
    const countText = strings.nodePool.pooledNodeCount(pooledCount);

    return (
        <button
            className={`${styles.button} ${styles.poolButton} ${isPooled ? styles.buttonActive : ''}`}
            onClick={handleToggle}
            aria-pressed={isPooled}
            aria-label={tooltipText}
            title={`${tooltipText} (${countText})`}
            style={isPooled ? POOL_ACTIVE_STYLE : undefined}
        >
            <BrainIcon size={20} filled={isPooled} />
            <PoolPreviewBadge pooledCount={pooledCount} totalCount={nodeCount} />
        </button>
    );
}
