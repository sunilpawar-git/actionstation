/**
 * InlineSharePanel — Renders workspace list for sharing inside the context menu.
 * Extracted from ShareMenu's portal rendering into a flat inline list.
 */
import React, { useCallback, useMemo } from 'react';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { strings } from '@/shared/localization/strings';
import { captureError } from '@/shared/services/sentryService';
import styles from './ShareMenu.module.css';

interface InlineSharePanelProps {
    readonly onShare: (targetWorkspaceId: string) => Promise<void>;
    readonly isSharing: boolean;
    readonly onClose: () => void;
}

export const InlineSharePanel = React.memo(function InlineSharePanel({
    onShare, isSharing, onClose,
}: InlineSharePanelProps) {
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const workspaces = useWorkspaceStore((s) => s.workspaces);

    const otherWorkspaces = useMemo(
        () => workspaces.filter((ws) => ws.id !== currentWorkspaceId && ws.type !== 'divider'),
        [workspaces, currentWorkspaceId],
    );

    const handleSelect = useCallback((workspaceId: string) => {
        if (isSharing) return;
        onClose();
        void onShare(workspaceId).catch((e: unknown) => captureError(e));
    }, [onShare, isSharing, onClose]);

    if (otherWorkspaces.length === 0) {
        return <div className={styles.emptyMessage}>{strings.nodeUtils.noOtherWorkspaces}</div>;
    }

    return (
        <div role="group" aria-label={strings.nodeUtils.shareToWorkspace}>
            {otherWorkspaces.map((ws) => (
                <button key={ws.id} className={styles.menuItem}
                    onClick={() => handleSelect(ws.id)} role="menuitem" disabled={isSharing}>
                    {ws.name}
                </button>
            ))}
        </div>
    );
});
