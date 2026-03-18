/**
 * KBDocumentGroup — Collapsible card for a grouped document (parent + children)
 * Shows document title, parts count, expand/collapse, and group-level actions
 */
import React, { useState, useCallback } from 'react';
import clsx from 'clsx';
import { strings } from '@/shared/localization/strings';
import { FileTextIcon, ChevronDownIcon } from '@/shared/components/icons';
import { KnowledgeBankEntryCard } from './KnowledgeBankEntryCard';
import { getDisplayTitle } from '../services/documentGrouper';
import type { DocumentGroup } from '../types/knowledgeBank';
import {
    KB_GROUP_CARD,
    KB_GROUP_CARD_STYLE,
    KB_GROUP_DISABLED,
    KB_GROUP_HEADER,
    KB_GROUP_HEADER_STYLE,
    KB_CHECKBOX,
    KB_DOC_ICON,
    KB_DOC_ICON_STYLE,
    KB_GROUP_TITLE,
    KB_GROUP_TITLE_STYLE,
    KB_PARTS_BADGE,
    KB_PARTS_BADGE_STYLE,
    KB_EXPAND_BTN,
    KB_EXPAND_BTN_STYLE,
    KB_EXPAND_BTN_OPEN,
    KB_SUMMARY_PREVIEW,
    KB_SUMMARY_PREVIEW_STYLE,
    KB_GROUP_ACTIONS,
    KB_GROUP_ACTIONS_STYLE,
    KB_DELETE_BTN,
    KB_DELETE_BTN_STYLE,
    KB_CHILDREN_LIST,
    KB_CHILDREN_LIST_STYLE,
} from './kbDocumentGroupStyles';

interface KBDocumentGroupProps {
    group: DocumentGroup;
    summarizingEntryIds: string[];
    onToggleGroup: (parentId: string) => void;
    onDeleteGroup: (parentId: string) => void;
    onToggle: (entryId: string) => void;
    onPin: (entryId: string) => void;
    onUpdate: (entryId: string, u: { title: string; content: string; tags: string[] }) => void;
    onDelete: (entryId: string) => void;
}

export const KBDocumentGroup = React.memo(function KBDocumentGroup({
    group, summarizingEntryIds,
    onToggleGroup, onDeleteGroup,
    onToggle, onPin, onUpdate, onDelete,
}: KBDocumentGroupProps) {
    const [isExpanded, setExpanded] = useState(false);
    const kb = strings.knowledgeBank;
    const displayTitle = getDisplayTitle(group.parent);
    const isGroupEnabled = group.parent.enabled;

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleGroup(group.parent.id);
    }, [group.parent.id, onToggleGroup]);

    const handleExpandToggle = useCallback(() => {
        setExpanded((prev) => !prev);
    }, []);

    const handleDelete = useCallback(() => {
        onDeleteGroup(group.parent.id);
    }, [group.parent.id, onDeleteGroup]);

    return (
        <div
            className={clsx(KB_GROUP_CARD, !isGroupEnabled && KB_GROUP_DISABLED)}
            style={KB_GROUP_CARD_STYLE}
        >
            <div
                className={KB_GROUP_HEADER}
                style={KB_GROUP_HEADER_STYLE}
                onClick={handleExpandToggle}
            >
                <input
                    type="checkbox"
                    checked={isGroupEnabled}
                    onClick={handleToggle}
                    onChange={() => undefined}
                    className={KB_CHECKBOX}
                    aria-label={kb.documentGroup.toggleAll}
                />
                <span className={KB_DOC_ICON} style={KB_DOC_ICON_STYLE} aria-hidden="true">
                    <FileTextIcon size={16} />
                </span>
                <h4 className={KB_GROUP_TITLE} style={KB_GROUP_TITLE_STYLE} title={displayTitle}>
                    {displayTitle}
                </h4>
                <span className={KB_PARTS_BADGE} style={KB_PARTS_BADGE_STYLE}>
                    {group.totalParts} {kb.documentGroup.partsCount}
                </span>
                <button
                    className={clsx(KB_EXPAND_BTN, isExpanded && KB_EXPAND_BTN_OPEN)}
                    style={KB_EXPAND_BTN_STYLE}
                    aria-label={isExpanded ? kb.documentGroup.collapse : kb.documentGroup.expand}
                >
                    <ChevronDownIcon size={12} />
                </button>
            </div>
            {group.parent.summary && !isExpanded && (
                <p className={KB_SUMMARY_PREVIEW} style={KB_SUMMARY_PREVIEW_STYLE}>
                    {group.parent.summary}
                </p>
            )}
            <div className={KB_GROUP_ACTIONS} style={KB_GROUP_ACTIONS_STYLE}>
                <button className={KB_DELETE_BTN} style={KB_DELETE_BTN_STYLE} onClick={handleDelete}>
                    {kb.documentGroup.deleteDocument}
                </button>
            </div>
            {isExpanded && (
                <ChildrenList group={group} summarizingEntryIds={summarizingEntryIds}
                    onToggle={onToggle} onPin={onPin} onUpdate={onUpdate} onDelete={onDelete} />
            )}
        </div>
    );
});

function ChildrenList({ group, summarizingEntryIds, onToggle, onPin, onUpdate, onDelete }: {
    group: DocumentGroup; summarizingEntryIds: string[];
    onToggle: (id: string) => void; onPin: (id: string) => void;
    onUpdate: (id: string, u: { title: string; content: string; tags: string[] }) => void;
    onDelete: (id: string) => void;
}) {
    return (
        <div className={KB_CHILDREN_LIST} style={KB_CHILDREN_LIST_STYLE}>
            {[group.parent, ...group.children].map((entry) => (
                <KnowledgeBankEntryCard key={entry.id} entry={entry}
                    isSummarizing={summarizingEntryIds.includes(entry.id)}
                    onToggle={onToggle} onPin={onPin} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
        </div>
    );
}
