/**
 * KnowledgeBankEntryEditor — Inline editor for KB entry title, content, and tags
 */
import { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { KB_MAX_CONTENT_SIZE, KB_MAX_TITLE_LENGTH } from '../types/knowledgeBank';
import { KBTagInput } from './KBTagInput';

import clsx from 'clsx';
import {
    KB_ENTRY_CARD, KB_ENTRY_CARD_STYLE, KB_ENTRY_EDITING,
    KB_EDIT_INPUT, KB_EDIT_INPUT_STYLE,
    KB_EDIT_TEXTAREA, KB_EDIT_TEXTAREA_STYLE,
    KB_EDIT_CHAR_COUNT, KB_EDIT_CHAR_COUNT_STYLE,
    KB_EDIT_ACTIONS, KB_EDIT_ACTIONS_STYLE,
    KB_EDIT_CANCEL_BUTTON, KB_EDIT_CANCEL_BUTTON_STYLE,
    KB_EDIT_SAVE_BUTTON, KB_EDIT_SAVE_BUTTON_STYLE,
} from './kbPanelStyles';

interface KnowledgeBankEntryEditorProps {
    initialTitle: string;
    initialContent: string;
    initialTags?: string[];
    onSave: (title: string, content: string, tags: string[]) => void;
    onCancel: () => void;
}

export function KnowledgeBankEntryEditor({
    initialTitle, initialContent, initialTags, onSave, onCancel
}: KnowledgeBankEntryEditorProps) {
    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(initialContent);
    const [tags, setTags] = useState<string[]>(initialTags ?? []);

    const handleSave = useCallback(() => {
        if (!title.trim()) return;
        onSave(title.trim(), content, tags);
    }, [title, content, tags, onSave]);

    return (
        <div className={clsx(KB_ENTRY_CARD, KB_ENTRY_EDITING)} style={KB_ENTRY_CARD_STYLE}>
            <input
                className={KB_EDIT_INPUT}
                style={KB_EDIT_INPUT_STYLE}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={strings.knowledgeBank.titlePlaceholder}
                maxLength={KB_MAX_TITLE_LENGTH}
            />
            <textarea
                className={KB_EDIT_TEXTAREA}
                style={KB_EDIT_TEXTAREA_STYLE}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={KB_MAX_CONTENT_SIZE}
            />
            <KBTagInput tags={tags} onChange={setTags} />
            <div className={KB_EDIT_CHAR_COUNT} style={KB_EDIT_CHAR_COUNT_STYLE}>
                {content.length} / {KB_MAX_CONTENT_SIZE.toLocaleString()}
            </div>
            <div className={KB_EDIT_ACTIONS} style={KB_EDIT_ACTIONS_STYLE}>
                <button className={KB_EDIT_CANCEL_BUTTON} style={KB_EDIT_CANCEL_BUTTON_STYLE} onClick={onCancel}>
                    {strings.common.cancel}
                </button>
                <button
                    className={KB_EDIT_SAVE_BUTTON}
                    style={KB_EDIT_SAVE_BUTTON_STYLE}
                    onClick={handleSave}
                    disabled={!title.trim()}
                >
                    {strings.common.save}
                </button>
            </div>
        </div>
    );
}
