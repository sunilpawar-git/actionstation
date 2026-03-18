/**
 * KnowledgeBankEntryCard — Single entry card in the KB panel
 * Shows title, content preview, toggle, edit/delete actions
 */
import React, { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { FileTextIcon, ImageIcon } from '@/shared/components/icons';
import { KnowledgeBankEntryEditor } from './KnowledgeBankEntryEditor';
import { EntryCardActions } from './EntryCardActions';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';
import { KB_PREVIEW_LENGTH } from '../types/knowledgeBank';
import clsx from 'clsx';
import {
    KB_ENTRY_CARD, KB_ENTRY_CARD_STYLE, KB_ENTRY_DISABLED,
    KB_CARD_HEADER_STYLE, KB_ENTRY_TITLE_ROW, KB_ENTRY_TITLE_ROW_STYLE,
    KB_CHECKBOX, KB_TYPE_ICON, KB_TYPE_ICON_STYLE,
    KB_CHUNK_BADGE, KB_CHUNK_BADGE_STYLE,
    KB_PINNED_BADGE, KB_PINNED_BADGE_STYLE,
    KB_ENTRY_TITLE, KB_ENTRY_TITLE_STYLE,
    KB_SUMMARIZING_BADGE, KB_SUMMARIZING_BADGE_STYLE,
    KB_ENTRY_PREVIEW, KB_ENTRY_PREVIEW_STYLE,
} from './kbPanelStyles';
import { KB_ENTRY_TAGS, KB_ENTRY_TAGS_STYLE, KB_ENTRY_TAG_PILL, KB_ENTRY_TAG_PILL_STYLE } from './kbEntryTagsStyles';

interface KnowledgeBankEntryCardProps {
    entry: KnowledgeBankEntry;
    isSummarizing?: boolean;
    onToggle: (entryId: string) => void;
    onPin: (entryId: string) => void;
    onUpdate: (entryId: string, u: { title: string; content: string; tags: string[] }) => void;
    onDelete: (entryId: string) => void;
}

export const KnowledgeBankEntryCard = React.memo(function KnowledgeBankEntryCard({
    entry, isSummarizing, onToggle, onPin, onUpdate, onDelete,
}: KnowledgeBankEntryCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const kb = strings.knowledgeBank;

    const handleSave = useCallback((title: string, content: string, tags: string[]) => {
        onUpdate(entry.id, { title, content, tags });
        setIsEditing(false);
    }, [entry.id, onUpdate]);

    if (isEditing) {
        return (
            <KnowledgeBankEntryEditor
                initialTitle={entry.title}
                initialContent={entry.content}
                initialTags={entry.tags}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
            />
        );
    }

    return (
        <div className={clsx(KB_ENTRY_CARD, !entry.enabled && KB_ENTRY_DISABLED)} style={KB_ENTRY_CARD_STYLE}>
            <div style={KB_CARD_HEADER_STYLE}>
                <div className={KB_ENTRY_TITLE_ROW} style={KB_ENTRY_TITLE_ROW_STYLE}>
                    <input
                        type="checkbox"
                        checked={entry.enabled}
                        onChange={() => onToggle(entry.id)}
                        className={KB_CHECKBOX}
                        aria-label={kb.toggleEntry}
                    />
                    <span className={KB_TYPE_ICON} style={KB_TYPE_ICON_STYLE} aria-hidden="true">
                        {entry.type === 'image'
                            ? <ImageIcon size={16} />
                            : <FileTextIcon size={16} />}
                    </span>
                    {entry.parentEntryId && (
                        <span className={KB_CHUNK_BADGE} style={KB_CHUNK_BADGE_STYLE}>{kb.chunkBadge}</span>
                    )}
                    {entry.pinned && (
                        <span className={KB_PINNED_BADGE} style={KB_PINNED_BADGE_STYLE}>{kb.pinnedBadge}</span>
                    )}
                    <h4 className={KB_ENTRY_TITLE} style={KB_ENTRY_TITLE_STYLE} title={entry.title}>
                        {entry.title}
                    </h4>
                </div>
            </div>
            {isSummarizing && (
                <p className={KB_SUMMARIZING_BADGE} style={KB_SUMMARIZING_BADGE_STYLE}>{kb.summarizing}</p>
            )}
            <p className={KB_ENTRY_PREVIEW} style={KB_ENTRY_PREVIEW_STYLE}>{entry.content.slice(0, KB_PREVIEW_LENGTH)}</p>
            {entry.tags && entry.tags.length > 0 && (
                <div className={KB_ENTRY_TAGS} style={KB_ENTRY_TAGS_STYLE}>
                    {entry.tags.map((tag) => (
                        <span key={tag} className={KB_ENTRY_TAG_PILL} style={KB_ENTRY_TAG_PILL_STYLE}>{tag}</span>
                    ))}
                </div>
            )}
            <EntryCardActions
                entryId={entry.id}
                isPinned={entry.pinned ?? false}
                onPin={onPin}
                onEdit={() => setIsEditing(true)}
                onDelete={onDelete}
            />
        </div>
    );
});
