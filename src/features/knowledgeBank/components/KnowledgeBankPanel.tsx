/**
 * KnowledgeBankPanel — Slide-out panel for managing KB entries
 * Slides from left edge, non-blocking (canvas remains visible)
 */
import { useCallback, useMemo } from 'react';
import { useKnowledgeBankStore, filterEntries } from '../stores/knowledgeBankStore';
import { useKnowledgeBankPanelHandlers } from '../hooks/useKnowledgeBankPanelHandlers';
import { useDocumentGroupHandlers } from '../hooks/useDocumentGroupHandlers';
import { useSidebarStore } from '@/shared/stores/sidebarStore';
import { KBSearchBar } from './KBSearchBar';
import { KBEntryList } from './KBEntryList';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { strings } from '@/shared/localization/strings';
import styles from './KnowledgeBankPanel.module.css';

/** Slide-out panel for browsing, searching, and managing Knowledge Bank entries. */
export function KnowledgeBankPanel() {
    const isPanelOpen = useKnowledgeBankStore((s) => s.isPanelOpen);
    const entries = useKnowledgeBankStore((s) => s.entries);
    const searchQuery = useKnowledgeBankStore((s) => s.searchQuery);
    const typeFilter = useKnowledgeBankStore((s) => s.typeFilter);
    const selectedTag = useKnowledgeBankStore((s) => s.selectedTag);
    const summarizingEntryIds = useKnowledgeBankStore((s) => s.summarizingEntryIds);
    const isPinned = useSidebarStore((s) => s.isPinned);
    const isHoverOpen = useSidebarStore((s) => s.isHoverOpen);
    const { handleToggle, handlePin, handleUpdate, handleDelete } = useKnowledgeBankPanelHandlers();
    const { handleToggleGroup, handleDeleteGroup } = useDocumentGroupHandlers();

    const filteredEntries = useMemo(
        () => filterEntries(entries, searchQuery, typeFilter, selectedTag),
        [entries, searchQuery, typeFilter, selectedTag]
    );

    const handleEscapeClose = useCallback(() => {
        useKnowledgeBankStore.getState().setPanelOpen(false);
    }, []);
    useEscapeLayer(ESCAPE_PRIORITY.KB_PANEL, isPanelOpen, handleEscapeClose);

    if (!isPanelOpen) return null;

    const isFiltering = searchQuery.trim().length > 0 || typeFilter !== 'all' || selectedTag !== null;
    const showEmpty = entries.length === 0;
    const showNoResults = !showEmpty && isFiltering && filteredEntries.length === 0;

    // When sidebar is unpinned and not hovered open, shift the panel left so it
    // sits against the narrow hover-trigger strip instead of the full sidebar width.
    const leftOffset =
        !isPinned && !isHoverOpen
            ? 'var(--sidebar-hover-trigger-width)'
            : 'var(--sidebar-width)';

    return (
        <div className={styles.panel} style={{ left: leftOffset, transition: `left var(--sidebar-transition)` }}>
            <PanelHeader onClose={() => useKnowledgeBankStore.getState().setPanelOpen(false)} />
            {entries.length > 0 && <KBSearchBar />}
            <KBEntryList
                showEmpty={showEmpty}
                showNoResults={showNoResults}
                filteredEntries={filteredEntries}
                summarizingEntryIds={summarizingEntryIds}
                onToggle={handleToggle}
                onPin={handlePin}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onToggleGroup={handleToggleGroup}
                onDeleteGroup={handleDeleteGroup}
            />
        </div>
    );
}

/** Header row with title and close button for the Knowledge Bank panel. */
function PanelHeader({ onClose }: { onClose: () => void }) {
    return (
        <div className={styles.panelHeader}>
            <h4 className={styles.panelTitle}>{strings.knowledgeBank.title}</h4>
            <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label={strings.settings.close}
            >
                {strings.common.closeSymbol}
            </button>
        </div>
    );
}
