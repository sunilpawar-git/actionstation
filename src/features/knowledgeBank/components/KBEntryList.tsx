import { useMemo } from 'react';
import { KnowledgeBankEntryCard } from './KnowledgeBankEntryCard';
import { KBDocumentGroup } from './KBDocumentGroup';
import { groupEntriesByDocument } from '../services/documentGrouper';
import { strings } from '@/shared/localization/strings';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';
import {
    KB_PANEL_ENTRIES, KB_PANEL_ENTRIES_STYLE,
    KB_EMPTY_STATE, KB_EMPTY_STATE_STYLE,
    KB_EMPTY_ICON_STYLE, KB_EMPTY_TEXT, KB_EMPTY_TEXT_STYLE,
    KB_EMPTY_HINT_STYLE,
} from './kbPanelStyles';

interface KBEntryListProps {
    showEmpty: boolean;
    showNoResults: boolean;
    filteredEntries: KnowledgeBankEntry[];
    summarizingEntryIds: string[];
    onToggle: (entryId: string) => void;
    onPin: (entryId: string) => void;
    onUpdate: (entryId: string, u: { title: string; content: string; tags: string[] }) => void;
    onDelete: (entryId: string) => void;
    onToggleGroup: (parentId: string) => void;
    onDeleteGroup: (parentId: string) => void;
}

export function KBEntryList({
    showEmpty, showNoResults, filteredEntries, summarizingEntryIds,
    onToggle, onPin, onUpdate, onDelete,
    onToggleGroup, onDeleteGroup,
}: KBEntryListProps) {
    const grouped = useMemo(
        () => groupEntriesByDocument(filteredEntries),
        [filteredEntries]
    );

    return (
        <div className={KB_PANEL_ENTRIES} style={KB_PANEL_ENTRIES_STYLE}>
            {showEmpty && <EmptyState />}
            {showNoResults && <NoResultsState />}
            {grouped.documents.map((group) => (
                <KBDocumentGroup
                    key={group.parent.id}
                    group={group}
                    summarizingEntryIds={summarizingEntryIds}
                    onToggleGroup={onToggleGroup}
                    onDeleteGroup={onDeleteGroup}
                    onToggle={onToggle}
                    onPin={onPin}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                />
            ))}
            {grouped.standalone.map((entry) => (
                <KnowledgeBankEntryCard
                    key={entry.id}
                    entry={entry}
                    isSummarizing={summarizingEntryIds.includes(entry.id)}
                    onToggle={onToggle}
                    onPin={onPin}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}

function EmptyState() {
    const kb = strings.knowledgeBank;
    return (
        <div className={KB_EMPTY_STATE} style={KB_EMPTY_STATE_STYLE}>
            <div style={KB_EMPTY_ICON_STYLE}>📚</div>
            <p className={KB_EMPTY_TEXT} style={KB_EMPTY_TEXT_STYLE}>{kb.emptyState}</p>
            <p style={KB_EMPTY_HINT_STYLE}>{kb.emptyStateDescription}</p>
        </div>
    );
}

function NoResultsState() {
    return (
        <div className={KB_EMPTY_STATE} style={KB_EMPTY_STATE_STYLE}>
            <p className={KB_EMPTY_TEXT} style={KB_EMPTY_TEXT_STYLE}>{strings.knowledgeBank.search.noResults}</p>
        </div>
    );
}
