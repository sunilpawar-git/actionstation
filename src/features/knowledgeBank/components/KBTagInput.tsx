/**
 * KBTagInput — Reusable tag input with add/remove pill UI
 * Used in KnowledgeBankEntryEditor for editing tags on an entry
 */
import React, { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { KB_MAX_TAGS_PER_ENTRY, KB_MAX_TAG_LENGTH } from '../types/knowledgeBank';
import {
    KB_TAG_INPUT_STYLE,
    KB_TAG_LIST,
    KB_TAG_LIST_STYLE,
    KB_TAG,
    KB_TAG_STYLE,
    KB_TAG_REMOVE,
    KB_TAG_REMOVE_STYLE,
    KB_TAG_FIELD,
    KB_TAG_FIELD_STYLE,
    KB_TAG_LIMIT,
    KB_TAG_LIMIT_STYLE,
} from './kbTagInputStyles';

interface KBTagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
}

export const KBTagInput = React.memo(function KBTagInput({ tags, onChange }: KBTagInputProps) {
    const [input, setInput] = useState('');
    const ts = strings.knowledgeBank.tags;

    const addTag = useCallback(() => {
        const trimmed = input.trim().toLowerCase();
        if (!trimmed) return;
        if (trimmed.length > KB_MAX_TAG_LENGTH) return;
        if (tags.length >= KB_MAX_TAGS_PER_ENTRY) return;
        if (tags.includes(trimmed)) return;
        onChange([...tags, trimmed]);
        setInput('');
    }, [input, tags, onChange]);

    const removeTag = useCallback((tag: string) => {
        onChange(tags.filter((t) => t !== tag));
    }, [tags, onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    }, [addTag]);

    const atLimit = tags.length >= KB_MAX_TAGS_PER_ENTRY;

    return (
        <div style={KB_TAG_INPUT_STYLE}>
            <div className={KB_TAG_LIST} style={KB_TAG_LIST_STYLE}>
                {tags.map((tag) => (
                    <span key={tag} className={KB_TAG} style={KB_TAG_STYLE}>
                        {tag}
                        <button
                            className={KB_TAG_REMOVE}
                            style={KB_TAG_REMOVE_STYLE}
                            onClick={() => removeTag(tag)}
                            aria-label={`${ts.removeTag} ${tag}`}
                        >
                            {strings.common.closeSymbol}
                        </button>
                    </span>
                ))}
            </div>
            {!atLimit && (
                <input
                    type="text"
                    className={KB_TAG_FIELD}
                    style={KB_TAG_FIELD_STYLE}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={ts.placeholder}
                    maxLength={KB_MAX_TAG_LENGTH}
                    aria-label={ts.addTag}
                />
            )}
            {atLimit && (
                <span className={KB_TAG_LIMIT} style={KB_TAG_LIMIT_STYLE}>{ts.maxReached}</span>
            )}
        </div>
    );
});
