/**
 * EntryCardActions — Edit / delete action buttons for a KB entry card
 * Extracted sub-component to keep KnowledgeBankEntryCard under line limit
 */
import React, { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { EditIcon, TrashIcon, PinIcon } from '@/shared/components/icons';
import clsx from 'clsx';
import {
    KB_ENTRY_ACTIONS, KB_ENTRY_ACTIONS_STYLE,
    KB_ACTION_BUTTON, KB_ACTION_BUTTON_STYLE,
    KB_DELETE_ACTION, KB_PIN_ACTION_STYLE,
    KB_CONFIRM_TEXT_STYLE,
} from './kbPanelStyles';

interface EntryCardActionsProps {
    entryId: string;
    isPinned: boolean;
    onPin: (entryId: string) => void;
    onEdit: () => void;
    onDelete: (entryId: string) => void;
}

export const EntryCardActions = React.memo(function EntryCardActions({
    entryId, isPinned, onPin, onEdit, onDelete,
}: EntryCardActionsProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const kb = strings.knowledgeBank;

    const handleDelete = useCallback(() => {
        if (isDeleting) {
            onDelete(entryId);
        } else {
            setIsDeleting(true);
        }
    }, [isDeleting, onDelete, entryId]);

    if (isDeleting) {
        return (
            <div className={KB_ENTRY_ACTIONS} style={KB_ENTRY_ACTIONS_STYLE}>
                <span style={KB_CONFIRM_TEXT_STYLE}>{kb.deleteConfirm}</span>
                <button
                    className={clsx(KB_ACTION_BUTTON, KB_DELETE_ACTION)}
                    style={KB_ACTION_BUTTON_STYLE}
                    onClick={handleDelete}
                    autoFocus
                >
                    {strings.common.confirm}
                </button>
                <button
                    className={KB_ACTION_BUTTON}
                    style={KB_ACTION_BUTTON_STYLE}
                    onClick={() => setIsDeleting(false)}
                >
                    {strings.common.cancel}
                </button>
            </div>
        );
    }

    return (
        <div className={KB_ENTRY_ACTIONS} style={KB_ENTRY_ACTIONS_STYLE}>
            <button
                className={KB_ACTION_BUTTON}
                style={isPinned ? { ...KB_ACTION_BUTTON_STYLE, ...KB_PIN_ACTION_STYLE } : KB_ACTION_BUTTON_STYLE}
                onClick={() => onPin(entryId)}
                aria-label={isPinned ? kb.unpinEntry : kb.pinEntry}
            >
                <PinIcon size={16} filled={isPinned} />
            </button>
            <button
                className={KB_ACTION_BUTTON}
                style={KB_ACTION_BUTTON_STYLE}
                onClick={onEdit}
                aria-label={kb.editEntry}
            >
                <EditIcon size={16} />
            </button>
            <button
                className={clsx(KB_ACTION_BUTTON, KB_DELETE_ACTION)}
                style={KB_ACTION_BUTTON_STYLE}
                onClick={handleDelete}
                aria-label={kb.deleteEntry}
            >
                <TrashIcon size={16} />
            </button>
        </div>
    );
});
