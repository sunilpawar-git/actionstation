/**
 * AIMemorySection — AI Memory settings subsection for CanvasSection.
 * Shows pooled node count, description, and clear button.
 * Title is provided by the parent SettingsGroup — this renders content only.
 */
import React, { useCallback, useMemo } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { BrainIcon } from '@/shared/components/icons';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import {
    SP_SETTING_DESC, SP_SETTING_DESC_STYLE,
    SP_MEMORY_INFO, SP_MEMORY_INFO_STYLE,
    SP_MEMORY_COUNT, SP_MEMORY_COUNT_STYLE,
    SP_CLEAR_BTN, SP_CLEAR_BTN_STYLE,
} from '../settingsPanelStyles';

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
        <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
            <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
                <BrainIcon size={14} filled={pooledCount > 0} />
                <span className={SP_SETTING_DESC} style={{ ...SP_SETTING_DESC_STYLE, margin: 0 }}>
                    {strings.nodePool.settingsTitle}
                </span>
            </div>
            <p className={SP_SETTING_DESC} style={SP_SETTING_DESC_STYLE}>
                {strings.nodePool.settingsDescription}
            </p>
            <div className={SP_MEMORY_INFO} style={SP_MEMORY_INFO_STYLE}>
                <span className={SP_MEMORY_COUNT} style={SP_MEMORY_COUNT_STYLE}>
                    {strings.nodePool.pooledNodeCount(pooledCount)}
                </span>
                {pooledCount > 0 && !isWorkspacePooled && (
                    <button className={SP_CLEAR_BTN} style={SP_CLEAR_BTN_STYLE} onClick={handleClearPool}>
                        {strings.nodePool.clearAll}
                    </button>
                )}
            </div>
        </div>
    );
});
