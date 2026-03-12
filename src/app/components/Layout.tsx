/**
 * Main Layout - Sidebar + Canvas Area
 * Manages pinned/hover sidebar mode with elastic topbar
 */
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Sidebar } from '@/shared/components/Sidebar';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { OfflineBanner } from './OfflineBanner';
import { SearchBar } from '@/features/search';
import { useSearchInputRef } from '@/features/search/hooks/useSearchInputRef';
import { WorkspaceControls } from '@/features/workspace/components/WorkspaceControls';
import { KnowledgeBankAddButton } from '@/features/knowledgeBank/components/KnowledgeBankAddButton';
import { KnowledgeBankPanel } from '@/features/knowledgeBank/components/KnowledgeBankPanel';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useSidebarStore } from '@/shared/stores/sidebarStore';
import { useSidebarHover } from '@/shared/hooks/useSidebarHover';
import styles from './Layout.module.css';

interface LayoutProps {
    children: ReactNode;
    onSettingsClick?: () => void;
}

export function Layout({ children, onSettingsClick }: LayoutProps) {
    const searchRef = useSearchInputRef();
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const isPinned = useSidebarStore((s) => s.isPinned);
    const isHoverOpen = useSidebarStore((s) => s.isHoverOpen);
    const { triggerZoneRef } = useSidebarHover();

    const handleSearchResultClick = useCallback(
        (nodeId: string, workspaceId: string) => {
            if (workspaceId === currentWorkspaceId) {
                const store = useCanvasStore.getState();
                store.clearSelection();
                store.selectNode(nodeId);
            }
        },
        [currentWorkspaceId]
    );

    return (
        <div
            className={styles.layout}
            data-sidebar-pinned={String(isPinned)}
            data-sidebar-open={String(isHoverOpen)}
        >
            <div
                ref={triggerZoneRef}
                data-testid="sidebar-trigger-zone"
                className={styles.sidebarZone}
            >
                <Sidebar onSettingsClick={onSettingsClick} />
            </div>
            <KnowledgeBankPanel />
            <div className={styles.mainArea}>
                <header className={styles.topBar}>
                    <KnowledgeBankAddButton />
                    <SearchBar ref={searchRef} onResultClick={handleSearchResultClick} />
                    <WorkspaceControls />
                    <SyncStatusIndicator />
                </header>
                <OfflineBanner />
                <main className={styles.main}>{children}</main>
            </div>
        </div>
    );
}
