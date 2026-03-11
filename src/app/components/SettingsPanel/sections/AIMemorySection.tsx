/**
 * AIMemorySection — AI Memory settings subsection for CanvasSection.
 * Shows pooled node count, description, and clear button.
 */
import React, { useCallback, useMemo } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { BrainIcon } from '@/shared/components/icons';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import styles from '../SettingsPanel.module.css';

export const AIMemorySection = React.memo(function AIMemorySection() {
    const nodeCount = useCanvasStore((s) => s.nodes.length);
    const individualPoolCount = useCanvasStore((s) => s.poolCount);
    const workspaces = useWorkspaceStore((s) => s.workspaces);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

    const isWorkspacePooled = useMemo(
        () => workspaces.find((w) => w.id === currentWorkspaceId)?.includeAllNodesInPool ?? false,
        [workspaces, currentWorkspaceId],
    );

    const pooledCount = isWorkspacePooled ? nodeCount : individualPoolCount;

    const handleClearPool = useCallback(() => {
        useCanvasStore.getState().clearAllNodePool();
        toast.success(strings.nodePool.cleared);
    }, []);

    return (
        <>
            <h3 className={styles.sectionTitle}>
                <BrainIcon size={14} filled={pooledCount > 0} />
                {' '}{strings.nodePool.settingsTitle}
            </h3>
            <p className={styles.settingDescription}>{strings.nodePool.settingsDescription}</p>
            <div className={styles.memoryInfo}>
                <span className={styles.memoryCount}>
                    {strings.nodePool.pooledNodeCount(pooledCount)}
                </span>
                {pooledCount > 0 && !isWorkspacePooled && (
                    <button className={styles.clearButton} onClick={handleClearPool}>
                        {strings.nodePool.clearAll}
                    </button>
                )}
            </div>
        </>
    );
});
